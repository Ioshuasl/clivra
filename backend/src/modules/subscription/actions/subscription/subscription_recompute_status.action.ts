import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import type { DomainEvent } from '../../../../shared/domain/domain_event.js';
import { CheckoutStatus } from '../../enum/billing/payment_status.enum.js';
import {
  READ_ONLY_SUBSCRIPTION_STATUSES,
  SubscriptionStatus,
} from '../../enum/subscription/subscription_status.enum.js';
import { addMonthsCivil, civilDateIn, civilToDate } from '../../helpers/billing_date.helper.js';
import { deriveBillingStatus } from '../../models/subscription/billing_state.model.js';
import { GetLatestCheckoutRepository } from '../../repositories/checkout/checkout_get_latest.repository.js';
import { UpdateCheckoutRepository } from '../../repositories/checkout/checkout_update.repository.js';
import { ListPaymentsBySubscriptionRepository } from '../../repositories/payment/payment_list_by_subscription.repository.js';
import { ApplyBillingStatusRepository } from '../../repositories/subscription/subscription_billing_apply_status.repository.js';
import { GetBillingRepository } from '../../repositories/subscription/subscription_billing_get.repository.js';
import type { RecomputeResult } from '../../types/billing/checkout.types.js';

const NOOP: RecomputeResult = { changed: false, from: '', to: '', readOnly: false, paidNow: false };

/**
 * Recalcula o status da assinatura a partir do espelho de cobranças (ADR-0017, D5).
 * Roda dentro da transação do chamador (webhook ou reconciliação); devolve os eventos a publicar.
 */
export class RecomputeStatusAction {
  constructor(
    private readonly getBilling = new GetBillingRepository(),
    private readonly listPayments = new ListPaymentsBySubscriptionRepository(),
    private readonly applyStatus = new ApplyBillingStatusRepository(),
    private readonly latestCheckout = new GetLatestCheckoutRepository(),
    private readonly updateCheckout = new UpdateCheckoutRepository(),
  ) {}

  async execute(
    tx: DbTransaction,
    tenantId: string,
  ): Promise<{ result: RecomputeResult; events: DomainEvent[] }> {
    const sub = await this.getBilling.executeInTx(tx, tenantId);
    if (!sub) return { result: NOOP, events: [] };

    const payments = await this.listPayments.execute(tx, sub.id);
    const derived = deriveBillingStatus({
      current: sub.status,
      payments: payments.map((p) => ({ status: p.status, dueDate: p.dueDate, deleted: p.deleted })),
      today: civilDateIn(sub.timezone),
    });
    if (derived.status === sub.status) {
      return { result: { ...NOOP, from: sub.status, to: sub.status }, events: [] };
    }

    const events: DomainEvent[] = [];
    let planId: string | undefined;
    let currentPeriodEnd: Date | null | undefined;

    if (derived.status === SubscriptionStatus.ACTIVE) {
      if (derived.paidReferenceDueDate) {
        currentPeriodEnd = civilToDate(addMonthsCivil(derived.paidReferenceDueDate, 1));
      }
      const checkout = await this.latestCheckout.execute(tx, tenantId);
      if (checkout) {
        if (checkout.planId !== sub.planId) planId = checkout.planId;
        await this.updateCheckout.execute(tx, checkout.id, { status: CheckoutStatus.PAID });
      }
      events.push({
        name: 'subscription.subscription_activated',
        payload: { subscriptionId: sub.id, from: sub.status, planId: planId ?? sub.planId },
      });
    } else if (derived.status === SubscriptionStatus.PAST_DUE) {
      events.push({
        name: 'subscription.payment_failed',
        payload: { subscriptionId: sub.id, from: sub.status },
      });
    }

    await this.applyStatus.execute(tx, {
      tenantId,
      subscriptionId: sub.id,
      status: derived.status,
      planId,
      currentPeriodEnd,
    });

    return {
      result: {
        changed: true,
        from: sub.status,
        to: derived.status,
        readOnly: READ_ONLY_SUBSCRIPTION_STATUSES.has(derived.status),
        paidNow: derived.status === SubscriptionStatus.ACTIVE,
      },
      events,
    };
  }
}
