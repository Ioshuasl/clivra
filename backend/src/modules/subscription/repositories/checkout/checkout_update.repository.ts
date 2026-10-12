import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import type { SubscriptionCheckoutRow } from '../../types/billing/subscription_payment.types.js';
import { mapSubscriptionCheckout } from './mappers/subscription_checkout.mapper.js';

export class UpdateCheckoutRepository {
  async execute(
    tx: DbTransaction,
    id: string,
    input: {
      status?: string;
      externalCheckoutId?: string | null;
      url?: string | null;
      expiresAt?: Date | null;
    },
  ): Promise<SubscriptionCheckoutRow> {
    const row = await tx.subscriptionCheckout.update({ where: { id }, data: input });
    return mapSubscriptionCheckout(row);
  }

  /** Atualiza o status pelo id do Asaas (eventos CHECKOUT_*); não faz nada se for desconhecido. */
  async executeByExternalId(
    tx: DbTransaction,
    externalCheckoutId: string,
    status: string,
  ): Promise<SubscriptionCheckoutRow | null> {
    const existing = await tx.subscriptionCheckout.findUnique({ where: { externalCheckoutId } });
    if (!existing) return null;
    const row = await tx.subscriptionCheckout.update({
      where: { id: existing.id },
      data: { status },
    });
    return mapSubscriptionCheckout(row);
  }
}
