import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import type { SubscriptionCheckoutRow } from '../../types/billing/subscription_payment.types.js';
import { mapSubscriptionCheckout } from './mappers/subscription_checkout.mapper.js';

export class GetLatestCheckoutRepository {
  /** Última tentativa que ainda pode virar assinatura (PENDING/PAID) — define o plano ao ativar. */
  async execute(tx: DbTransaction, tenantId: string): Promise<SubscriptionCheckoutRow | null> {
    const row = await tx.subscriptionCheckout.findFirst({
      where: { tenantId, status: { in: ['PENDING', 'PAID'] } },
      orderBy: { createdAt: 'desc' },
    });
    return row ? mapSubscriptionCheckout(row) : null;
  }
}
