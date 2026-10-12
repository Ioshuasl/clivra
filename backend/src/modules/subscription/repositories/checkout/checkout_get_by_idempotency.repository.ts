import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import type { SubscriptionCheckoutRow } from '../../types/billing/subscription_payment.types.js';
import { mapSubscriptionCheckout } from './mappers/subscription_checkout.mapper.js';

export class GetCheckoutByIdempotencyRepository {
  async execute(
    tx: DbTransaction,
    tenantId: string,
    idempotencyKey: string,
  ): Promise<SubscriptionCheckoutRow | null> {
    const row = await tx.subscriptionCheckout.findUnique({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
    });
    return row ? mapSubscriptionCheckout(row) : null;
  }
}
