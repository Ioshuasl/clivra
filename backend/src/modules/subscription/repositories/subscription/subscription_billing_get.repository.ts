import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { SubscriptionBillingRow } from '../../types/billing/subscription_payment.types.js';

export class GetBillingRepository {
  async execute(ctx: RequestContext): Promise<SubscriptionBillingRow | null> {
    return getTenantPrisma().runInTenantContext(ctx, (tx) => this.executeInTx(tx, ctx.tenantId));
  }

  async executeInTx(tx: DbTransaction, tenantId: string): Promise<SubscriptionBillingRow | null> {
    const row = await tx.subscription.findUnique({ where: { tenantId } });
    if (!row) return null;
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { timezone: true },
    });
    return {
      id: row.id,
      tenantId: row.tenantId,
      planId: row.planId,
      status: row.status,
      trialEndsAt: row.trialEndsAt,
      currentPeriodEnd: row.currentPeriodEnd,
      externalCustomerId: row.externalCustomerId,
      externalSubscriptionId: row.externalSubscriptionId,
      billingMethod: row.billingMethod,
      billingProvider: row.billingProvider,
      timezone: tenant?.timezone ?? 'America/Sao_Paulo',
    };
  }
}
