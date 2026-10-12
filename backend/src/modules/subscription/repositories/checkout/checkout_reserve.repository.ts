import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';
import type { SubscriptionCheckoutRow } from '../../types/billing/subscription_payment.types.js';
import { mapSubscriptionCheckout } from './mappers/subscription_checkout.mapper.js';

/** Reserva a tentativa (PENDING) antes de chamar o gateway; UNIQUE(tenant, key) barra concorrência. */
export class ReserveCheckoutRepository {
  async execute(
    tx: DbTransaction,
    input: { tenantId: string; idempotencyKey: string; planId: string; billingMethod: string },
  ): Promise<SubscriptionCheckoutRow> {
    const row = await tx.subscriptionCheckout.create({
      data: {
        id: idGenerator.next(),
        tenantId: input.tenantId,
        idempotencyKey: input.idempotencyKey,
        planId: input.planId,
        billingMethod: input.billingMethod,
        status: 'PENDING',
      },
    });
    return mapSubscriptionCheckout(row);
  }
}
