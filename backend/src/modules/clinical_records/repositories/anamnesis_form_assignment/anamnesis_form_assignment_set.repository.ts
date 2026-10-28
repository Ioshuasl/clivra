import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';

export class SetRepository {
  /** `formName` nulo remove a atribuição (o profissional volta ao modelo geral). */
  async execute(ctx: RequestContext, professionalId: string, formName: string | null): Promise<void> {
    await getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      if (formName === null) {
        await tx.anamnesisFormAssignment.deleteMany({
          where: { tenantId: ctx.tenantId, professionalId },
        });
        return;
      }
      await tx.anamnesisFormAssignment.upsert({
        where: { tenantId_professionalId: { tenantId: ctx.tenantId, professionalId } },
        create: { id: idGenerator.next(), tenantId: ctx.tenantId, professionalId, formName },
        update: { formName },
      });
    });
  }
}
