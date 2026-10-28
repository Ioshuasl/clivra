import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';

export class DeleteRepository {
  async execute(ctx: RequestContext, professionalId: string): Promise<boolean> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const result = await tx.professionalCertificate.deleteMany({
        where: { tenantId: ctx.tenantId, professionalId },
      });
      return result.count > 0;
    });
  }
}
