import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { AuditAction, writeAuditLogSafe } from '../../../../shared/database/write_audit.js';
import { P12ReadError, readP12 } from '../../helpers/certificate_p12.helper.js';
import { isCertificateExpired } from '../../models/certificate/certificate.model.js';
import {
  CertificateExpiredError,
  CertificateInvalidFileError,
  CertificateWrongPasswordError,
} from '../../models/errors/documents.errors.js';
import { GetRepository } from '../../repositories/certificate/certificate_get.repository.js';
import { UpdateRepository } from '../../repositories/certificate/certificate_update.repository.js';
import type { CertificateUploadSchema } from '../../schemas/certificate.schema.js';
import type { CertificateInfo, CertificateSummary } from '../../types/certificate/certificate.types.js';
import { ResolveProfessionalService } from './certificate_resolve_professional.service.js';

export class UpdateService {
  constructor(
    private readonly resolveProfessional = new ResolveProfessionalService(),
    private readonly updateCertificate = new UpdateRepository(),
    private readonly getCertificate = new GetRepository(),
  ) {}

  async execute(
    ctx: RequestContext,
    certificateSchema: CertificateUploadSchema,
    extra?: { ip?: string },
  ): Promise<CertificateSummary> {
    const professional = await this.resolveProfessional.execute(ctx);

    const pfx = Buffer.from(certificateSchema.pfxBase64, 'base64');
    if (pfx.length === 0) throw new CertificateInvalidFileError();

    let info: CertificateInfo;
    try {
      info = readP12(pfx, certificateSchema.password);
    } catch (error) {
      if (error instanceof P12ReadError && error.reason === 'WRONG_PASSWORD') {
        throw new CertificateWrongPasswordError();
      }
      throw new CertificateInvalidFileError();
    }
    if (isCertificateExpired(info.notAfter)) throw new CertificateExpiredError();

    await this.updateCertificate.execute(ctx, professional.id, pfx, info);
    await writeAuditLogSafe({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: AuditAction.CERTIFICATE_UPLOADED,
      resourceType: 'professional_certificate',
      resourceId: professional.id,
      ipAddress: extra?.ip,
      metadata: { serial: info.serialNumber, notAfter: info.notAfter.toISOString() },
    });

    const saved = await this.getCertificate.execute(ctx, professional.id);
    if (!saved) throw new CertificateInvalidFileError();
    return saved;
  }
}
