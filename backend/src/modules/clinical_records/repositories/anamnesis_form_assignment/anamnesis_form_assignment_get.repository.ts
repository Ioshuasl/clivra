import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';

export class GetRepository {
  async execute(ctx: RequestContext, professionalId: string): Promise<string | null> {
    const row = await getTenantPrisma().runInTenantContext(ctx, (tx) =>
      tx.anamnesisFormAssignment.findUnique({
        where: { tenantId_professionalId: { tenantId: ctx.tenantId, professionalId } },
      }),
    );
    return row?.formName ?? null;
  }
}
