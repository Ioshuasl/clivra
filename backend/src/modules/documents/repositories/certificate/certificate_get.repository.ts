import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { isCertificateExpired } from '../../models/certificate/certificate.model.js';
import type { CertificateSummary } from '../../types/certificate/certificate.types.js';

/** Dados públicos do certificado do profissional (sem o arquivo). */
export class GetRepository {
  async execute(ctx: RequestContext, professionalId: string): Promise<CertificateSummary | null> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const row = await tx.professionalCertificate.findFirst({
        where: { tenantId: ctx.tenantId, professionalId },
      });
      if (!row) return null;
      return {
        subjectName: row.subjectName,
        issuerName: row.issuerName,
        serialNumber: row.serialNumber,
        notBefore: row.notBefore.toISOString(),
        notAfter: row.notAfter.toISOString(),
        expired: isCertificateExpired(row.notAfter),
        uploadedAt: row.createdAt.toISOString(),
      };
    });
  }
}
