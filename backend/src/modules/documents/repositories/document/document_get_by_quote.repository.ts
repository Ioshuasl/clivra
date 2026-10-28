import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';

/** Id do contrato ativo (não cancelado) já emitido para o orçamento, se houver. */
export class GetByQuoteRepository {
  async execute(ctx: RequestContext, quoteId: string): Promise<string | null> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const row = await tx.document.findFirst({
        where: { tenantId: ctx.tenantId, quoteId, status: { not: 'CANCELLED' } },
        select: { id: true },
      });
      return row?.id ?? null;
    });
  }
}
