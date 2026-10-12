import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { SubscriptionPaymentRow } from '../../types/billing/subscription_payment.types.js';
import { mapSubscriptionPayment } from './mappers/subscription_payment.mapper.js';

export class ListPaymentsPageRepository {
  /** Cursor = id da última linha; ordem estável por vencimento desc, id desc. */
  async execute(
    ctx: RequestContext,
    input: { limit: number; cursor?: string },
  ): Promise<{ items: SubscriptionPaymentRow[]; nextCursor: string | null }> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const rows = await tx.subscriptionPayment.findMany({
        where: { tenantId: ctx.tenantId, deleted: false },
        orderBy: [{ dueDate: 'desc' }, { id: 'desc' }],
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });
      const page = rows.slice(0, input.limit);
      return {
        items: page.map(mapSubscriptionPayment),
        nextCursor: rows.length > input.limit ? (page[page.length - 1]?.id ?? null) : null,
      };
    });
  }
}
