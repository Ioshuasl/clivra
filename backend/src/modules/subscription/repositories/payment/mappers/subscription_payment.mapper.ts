import type { SubscriptionPayment } from '@prisma/client';
import type { SubscriptionPaymentRow } from '../../../types/billing/subscription_payment.types.js';

export function mapSubscriptionPayment(row: SubscriptionPayment): SubscriptionPaymentRow {
  return {
    id: row.id,
    subscriptionId: row.subscriptionId,
    externalPaymentId: row.externalPaymentId,
    status: row.status,
    valueCents: Number(row.valueCents),
    dueDate: row.dueDate.toISOString().slice(0, 10),
    paidAt: row.paidAt?.toISOString() ?? null,
    billingType: row.billingType,
    invoiceUrl: row.invoiceUrl,
    bankSlipUrl: row.bankSlipUrl,
    deleted: row.deleted,
    createdAt: row.createdAt.toISOString(),
  };
}
