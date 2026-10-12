import type { DbTransaction } from '../../../../shared/database/db_transaction.js';

/** Grava os ids do Asaas e a forma de cobrança na assinatura do tenant. */
export class SetBillingRepository {
  async execute(
    tx: DbTransaction,
    subscriptionId: string,
    input: {
      externalCustomerId?: string | null;
      externalSubscriptionId?: string | null;
      billingMethod?: string | null;
      billingProvider?: string;
      currentPeriodEnd?: Date | null;
    },
  ): Promise<void> {
    await tx.subscription.update({ where: { id: subscriptionId }, data: input });
  }
}
