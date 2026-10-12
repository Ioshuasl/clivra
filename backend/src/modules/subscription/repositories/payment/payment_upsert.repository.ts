import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';
import {
  NOT_REGRESSIVE_FROM_PAID,
  PAID_PAYMENT_STATUSES,
} from '../../enum/billing/payment_status.enum.js';
import { civilToDate } from '../../helpers/billing_date.helper.js';
import type { BillingPayment } from '../../types/billing/billing.types.js';
import type { SubscriptionPaymentRow } from '../../types/billing/subscription_payment.types.js';
import { mapSubscriptionPayment } from './mappers/subscription_payment.mapper.js';

/**
 * Espelho local da cobrança, idempotente por `external_payment_id`.
 * Cobrança já paga não regride para pendente/vencido (evento atrasado).
 */
export class UpsertPaymentRepository {
  async execute(
    tx: DbTransaction,
    input: { tenantId: string; subscriptionId: string; payment: BillingPayment },
  ): Promise<SubscriptionPaymentRow> {
    const p = input.payment;
    const existing = await tx.subscriptionPayment.findUnique({
      where: { externalPaymentId: p.id },
    });
    const now = new Date();

    if (!existing) {
      const created = await tx.subscriptionPayment.create({
        data: {
          id: idGenerator.next(),
          tenantId: input.tenantId,
          subscriptionId: input.subscriptionId,
          externalPaymentId: p.id,
          status: p.status,
          valueCents: BigInt(p.valueCents),
          dueDate: civilToDate(p.dueDate),
          paidAt: PAID_PAYMENT_STATUSES.has(p.status) ? (p.paidAt ?? now) : null,
          billingType: p.billingType,
          invoiceUrl: p.invoiceUrl,
          bankSlipUrl: p.bankSlipUrl,
          deleted: p.deleted,
          lastEventAt: now,
        },
      });
      return mapSubscriptionPayment(created);
    }

    const wasPaid = PAID_PAYMENT_STATUSES.has(existing.status);
    const regressive = wasPaid && NOT_REGRESSIVE_FROM_PAID.has(p.status);
    const nextStatus = regressive ? existing.status : p.status;
    const becamePaid = !wasPaid && PAID_PAYMENT_STATUSES.has(nextStatus);

    const updated = await tx.subscriptionPayment.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        valueCents: BigInt(p.valueCents),
        dueDate: civilToDate(p.dueDate),
        paidAt: becamePaid ? (p.paidAt ?? now) : existing.paidAt,
        billingType: p.billingType ?? existing.billingType,
        invoiceUrl: p.invoiceUrl ?? existing.invoiceUrl,
        bankSlipUrl: p.bankSlipUrl ?? existing.bankSlipUrl,
        deleted: p.deleted,
        lastEventAt: now,
      },
    });
    return mapSubscriptionPayment(updated);
  }
}
