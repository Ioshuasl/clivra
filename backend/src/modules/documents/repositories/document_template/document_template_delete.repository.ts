import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';

/** "Excluir" modelo = desativar; documentos já emitidos mantêm a própria cópia do texto. */
export class DeleteRepository {
  async execute(ctx: RequestContext, templateId: string): Promise<boolean> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const result = await tx.documentTemplate.updateMany({
        where: { id: templateId, tenantId: ctx.tenantId },
        data: { active: false },
      });
      return result.count > 0;
    });
  }
}
