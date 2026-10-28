import { createHash } from 'node:crypto';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import { AuditAction, writeAuditLogSafe } from '../../../../shared/database/write_audit.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import { getObjectStorage, ObjectStorageError } from '../../../../shared/storage/index.js';
import { formatSignedAt, patientMethodLabel } from '../../helpers/document_patient_stamp.helper.js';
import { buildDocumentPdfInput } from '../../helpers/document_pdf_input.helper.js';
import { documentPatientPdfStorageKey, renderDocumentPdf } from '../../helpers/document_pdf.helper.js';
import { statusAfterPatientSignature } from '../../models/document/document_signature.model.js';
import { SetSignedRepository } from '../../repositories/document/document_set_signed.repository.js';
import { SetStatusRepository } from '../../repositories/document/document_set_status.repository.js';
import { MarkUsedRepository } from '../../repositories/signature_request/signature_request_mark_used.repository.js';
import { CreateRepository as CreateSignatureRepository } from '../../repositories/signature/signature_create.repository.js';
import { BuildVariablesService } from '../../services/document/document_variables_build.service.js';
import type { DocumentRecord } from '../../types/document/document.types.js';
import type { SignatureRequestState } from '../../types/signature_request/signature_request.types.js';

type PatientSignInput = {
  request: SignatureRequestState;
  document: DocumentRecord;
  patientName: string;
  codeVerified: boolean;
  meta: { ip?: string; userAgent?: string };
};

/**
 * Registra o aceite do paciente. Se o dentista ainda não assinou digitalmente, o PDF é refeito com o
 * carimbo do paciente; se já assinou, o PDF assinado fica intacto (mexer nele quebraria a assinatura).
 */
export class PatientSignAction {
  constructor(
    private readonly uow = new UnitOfWork(),
    private readonly buildVariables = new BuildVariablesService(),
    private readonly createSignature = new CreateSignatureRepository(),
    private readonly markUsed = new MarkUsedRepository(),
    private readonly setSigned = new SetSignedRepository(),
    private readonly setStatus = new SetStatusRepository(),
  ) {}

  async execute(ctx: RequestContext, input: PatientSignInput): Promise<{ signedAt: Date }> {
    const { request, document } = input;
    const signedAt = new Date();
    const professionalSigned = document.signatures.some((signature) => signature.signerType === 'PROFESSIONAL');
    const status = statusAfterPatientSignature(document.professionalSignature, professionalSigned);
    const method = request.method === 'WHATSAPP_CODE' ? 'PATIENT_WHATSAPP_CODE' : 'PATIENT_ACCEPT';

    let refreshedPdf: { key: string; sha256: string } | null = null;
    if (!professionalSigned) {
      const built = await this.buildVariables.execute(ctx, document.patientId, document.professionalId);
      const pdf = await renderDocumentPdf(
        buildDocumentPdfInput({
          built,
          title: document.title,
          content: document.content,
          contentHash: document.contentHash,
          professionalSignature: document.professionalSignature,
          patientSignature: document.patientSignature,
          patientStamp: {
            signedAtLabel: formatSignedAt(signedAt, built.timezone),
            methodLabel: patientMethodLabel(method, request.codeSentVia),
          },
        }),
      );
      const key = documentPatientPdfStorageKey(ctx.tenantId, document.id);
      try {
        await getObjectStorage().putObject(key, pdf, 'application/pdf');
      } catch (err) {
        if (err instanceof ObjectStorageError) {
          throw new AppError('STORAGE_UNAVAILABLE', 'Armazenamento indisponível.', 503);
        }
        throw err;
      }
      refreshedPdf = { key, sha256: createHash('sha256').update(pdf).digest('hex') };
    }

    await this.uow.run(ctx, async ({ tx }) => {
      await this.createSignature.executeInTx(tx, ctx, {
        id: idGenerator.next(),
        documentId: document.id,
        signerType: 'PATIENT',
        method,
        professionalId: null,
        signerName: input.patientName,
        certificateSubject: null,
        certificateSerial: null,
        certificateNotAfter: null,
        signedPdfKey: refreshedPdf?.key ?? null,
        signedPdfSha256: refreshedPdf?.sha256 ?? null,
        evidence: {
          ip: input.meta.ip ?? null,
          userAgent: input.meta.userAgent ?? null,
          contentHash: document.contentHash,
          requestId: request.id,
          codeVerified: input.codeVerified,
          codeSentVia: request.codeSentVia,
        },
        signedAt,
      });
      await this.markUsed.executeInTx(tx, ctx, request.id);
      if (refreshedPdf) {
        await this.setSigned.executeInTx(tx, ctx, document.id, {
          pdfKey: refreshedPdf.key,
          pdfSha256: refreshedPdf.sha256,
          status,
        });
      } else {
        await this.setStatus.executeInTx(tx, ctx, document.id, status);
      }
    });

    await writeAuditLogSafe({
      tenantId: ctx.tenantId,
      actorType: 'PATIENT',
      action: AuditAction.DOCUMENT_SIGNED,
      resourceType: 'document',
      resourceId: document.id,
      patientId: document.patientId,
      ipAddress: input.meta.ip,
      userAgent: input.meta.userAgent,
      metadata: { method, codeVerified: input.codeVerified },
    });

    return { signedAt };
  }
}
