import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { SubscriptionPaymentRow } from '../../types/billing/subscription_payment.types.js';
import { mapSubscriptionPayment } from './mappers/subscription_payment.mapper.js';

export class GetPaymentRepository {
  async execute(ctx: RequestContext, id: string): Promise<SubscriptionPaymentRow | null> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const row = await tx.subscriptionPayment.findFirst({
        where: { id, tenantId: ctx.tenantId },
      });
      return row ? mapSubscriptionPayment(row) : null;
    });
  }
}
