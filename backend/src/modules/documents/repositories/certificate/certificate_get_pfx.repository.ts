import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { decryptField } from '../../../../shared/crypto/envelope.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { unwrapActiveDek } from '../../../../shared/database/tenant_dek.js';
import type { CertificateRecord } from '../../types/certificate/certificate.types.js';

/** Lê o .pfx já descriptografado. Só a assinatura usa isto; o arquivo nunca vai para a API. */
export class GetPfxRepository {
  async execute(ctx: RequestContext, professionalId: string): Promise<CertificateRecord | null> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const row = await tx.professionalCertificate.findFirst({
        where: { tenantId: ctx.tenantId, professionalId },
      });
      if (!row) return null;
      const dek = await unwrapActiveDek(tx, ctx.tenantId);
      const pfxBase64 = decryptField(row.pfxEncrypted, dek, {
        tenantId: ctx.tenantId,
        table: 'professional_certificate',
        column: 'pfx_encrypted',
        rowId: row.id,
      });
      return {
        id: row.id,
        pfx: Buffer.from(pfxBase64, 'base64'),
        subjectName: row.subjectName,
        issuerName: row.issuerName,
        serialNumber: row.serialNumber,
        fingerprintSha256: row.fingerprintSha256,
        notBefore: row.notBefore,
        notAfter: row.notAfter,
      };
    });
  }
}
