import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import type { SubscriptionPaymentRow } from '../../types/billing/subscription_payment.types.js';
import { mapSubscriptionPayment } from './mappers/subscription_payment.mapper.js';

export class ListPaymentsBySubscriptionRepository {
  async execute(tx: DbTransaction, subscriptionId: string): Promise<SubscriptionPaymentRow[]> {
    const rows = await tx.subscriptionPayment.findMany({
      where: { subscriptionId },
      orderBy: { dueDate: 'desc' },
    });
    return rows.map(mapSubscriptionPayment);
  }
}
