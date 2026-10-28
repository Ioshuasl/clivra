import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { encryptField } from '../../../../shared/crypto/envelope.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { unwrapActiveDek } from '../../../../shared/database/tenant_dek.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';
import type { CertificateInfo } from '../../types/certificate/certificate.types.js';

/** Cadastra (ou troca) o certificado do profissional. O .pfx é criptografado com a DEK do tenant. */
export class UpdateRepository {
  async execute(
    ctx: RequestContext,
    professionalId: string,
    pfx: Buffer,
    info: CertificateInfo,
  ): Promise<void> {
    await getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const dek = await unwrapActiveDek(tx, ctx.tenantId);
      const id = idGenerator.next();
      const pfxEncrypted = encryptField(pfx.toString('base64'), dek, {
        tenantId: ctx.tenantId,
        table: 'professional_certificate',
        column: 'pfx_encrypted',
        rowId: id,
      });
      await tx.professionalCertificate.deleteMany({
        where: { tenantId: ctx.tenantId, professionalId },
      });
      await tx.professionalCertificate.create({
        data: {
          id,
          tenantId: ctx.tenantId,
          professionalId,
          pfxEncrypted,
          subjectName: info.subjectName,
          issuerName: info.issuerName,
          serialNumber: info.serialNumber,
          fingerprintSha256: info.fingerprintSha256,
          notBefore: info.notBefore,
          notAfter: info.notAfter,
          uploadedBy: ctx.userId,
        },
      });
    });
  }
}
