import { createHash } from 'node:crypto';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import { AuditAction, writeAuditLogSafe } from '../../../../shared/database/write_audit.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import { getObjectStorage, ObjectStorageError } from '../../../../shared/storage/index.js';
import { P12ReadError, readP12 } from '../../helpers/certificate_p12.helper.js';
import { buildDocumentPdfInput } from '../../helpers/document_pdf_input.helper.js';
import { documentSignedPdfStorageKey, renderDocumentPdf } from '../../helpers/document_pdf.helper.js';
import { patientStampFromSignatures } from '../../helpers/document_patient_stamp.helper.js';
import { signPdfWithP12 } from '../../helpers/document_pdf_sign.helper.js';
import { isCertificateExpired } from '../../models/certificate/certificate.model.js';
import { statusAfterProfessionalSignature } from '../../models/document/document_signature.model.js';
import {
  CertificateExpiredError,
  CertificateInvalidFileError,
  CertificateNotFoundError,
  CertificateWrongPasswordError,
} from '../../models/errors/documents.errors.js';
import { GetPfxRepository } from '../../repositories/certificate/certificate_get_pfx.repository.js';
import { SetSignedRepository } from '../../repositories/document/document_set_signed.repository.js';
import { CreateRepository as CreateSignatureRepository } from '../../repositories/signature/signature_create.repository.js';
import { BuildVariablesService } from '../../services/document/document_variables_build.service.js';
import type { DocumentRecord } from '../../types/document/document.types.js';

function signedAtLabel(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

/** Assina o PDF do documento com o A1 do dentista e registra a assinatura (append-only) com auditoria. */
export class SignAction {
  constructor(
    private readonly uow = new UnitOfWork(),
    private readonly getPfx = new GetPfxRepository(),
    private readonly buildVariables = new BuildVariablesService(),
    private readonly createSignature = new CreateSignatureRepository(),
    private readonly setSigned = new SetSignedRepository(),
  ) {}

  async execute(
    ctx: RequestContext,
    document: DocumentRecord,
    password: string,
    extra?: { ip?: string },
  ): Promise<void> {
    const certificate = await this.getPfx.execute(ctx, document.professionalId);
    if (!certificate) throw new CertificateNotFoundError();
    if (isCertificateExpired(certificate.notAfter)) throw new CertificateExpiredError();
    try {
      readP12(certificate.pfx, password);
    } catch (error) {
      if (error instanceof P12ReadError && error.reason === 'WRONG_PASSWORD') {
        throw new CertificateWrongPasswordError();
      }
      throw new CertificateInvalidFileError();
    }

    const built = await this.buildVariables.execute(ctx, document.patientId, document.professionalId);
    const signingTime = new Date();
    const pdf = await renderDocumentPdf(
      buildDocumentPdfInput({
        built,
        title: document.title,
        content: document.content,
        contentHash: document.contentHash,
        professionalSignature: document.professionalSignature,
        patientSignature: document.patientSignature,
        patientStamp: patientStampFromSignatures(document.signatures, built.timezone),
        signature: {
          signerName: built.professional.name,
          signedAtLabel: signedAtLabel(signingTime, built.timezone),
          certificateSubject: certificate.subjectName,
        },
      }),
    );
    const signedPdf = await signPdfWithP12(pdf, certificate.pfx, password, {
      signerName: built.professional.name,
      reason: `Assinatura do documento "${document.title}"`,
      signingTime,
    });

    const key = documentSignedPdfStorageKey(ctx.tenantId, document.id);
    try {
      await getObjectStorage().putObject(key, signedPdf, 'application/pdf');
    } catch (err) {
      if (err instanceof ObjectStorageError) {
        throw new AppError('STORAGE_UNAVAILABLE', 'Armazenamento indisponível.', 503);
      }
      throw err;
    }
    const sha256 = createHash('sha256').update(signedPdf).digest('hex');

    await this.uow.run(ctx, async ({ tx }) => {
      await this.createSignature.executeInTx(tx, ctx, {
        id: idGenerator.next(),
        documentId: document.id,
        signerType: 'PROFESSIONAL',
        method: 'ICP_A1',
        evidence: null,
        professionalId: document.professionalId,
        signerName: built.professional.name,
        certificateSubject: certificate.subjectName,
        certificateSerial: certificate.serialNumber,
        certificateNotAfter: certificate.notAfter,
        signedPdfKey: key,
        signedPdfSha256: sha256,
        signedAt: signingTime,
      });
      await this.setSigned.executeInTx(tx, ctx, document.id, {
        pdfKey: key,
        pdfSha256: sha256,
        status: statusAfterProfessionalSignature(
          document.patientSignature,
          document.signatures.some((signature) => signature.signerType !== 'PROFESSIONAL'),
        ),
      });
    });

    await writeAuditLogSafe({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: AuditAction.DOCUMENT_SIGNED,
      resourceType: 'document',
      resourceId: document.id,
      patientId: document.patientId,
      ipAddress: extra?.ip,
      metadata: { method: 'ICP_A1', certificateSerial: certificate.serialNumber },
    });
  }
}
