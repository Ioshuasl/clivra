import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { logger } from '../../../../shared/config/logger.js';
import { AuditAction, writeAuditLogSafe } from '../../../../shared/database/write_audit.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import { disableAllAutomations } from '../../../messaging/messaging_public.js';
import { getBillingAdapter } from '../../adapters/billing_adapter.factory.js';
import { BillingProvider } from '../../enum/billing/billing_provider.enum.js';
import { SubscriptionStatus } from '../../enum/subscription/subscription_status.enum.js';
import { ListPaymentsBySubscriptionRepository } from '../../repositories/payment/payment_list_by_subscription.repository.js';
import { MarkMissingPaymentsDeletedRepository } from '../../repositories/payment/payment_mark_missing_deleted.repository.js';
import { UpsertPaymentRepository } from '../../repositories/payment/payment_upsert.repository.js';
import { ApplyBillingStatusRepository } from '../../repositories/subscription/subscription_billing_apply_status.repository.js';
import { GetBillingRepository } from '../../repositories/subscription/subscription_billing_get.repository.js';
import type { RecomputeResult } from '../../types/billing/checkout.types.js';
import { RecomputeStatusAction } from './subscription_recompute_status.action.js';

export type ReconcileSummary = {
  checked: boolean;
  divergences: number;
  statusFrom: string | null;
  statusTo: string | null;
};

const SKIPPED: ReconcileSummary = { checked: false, divergences: 0, statusFrom: null, statusTo: null };

/**
 * Reconciliação (rede de segurança dos webhooks): consulta o Asaas, corrige o espelho local e
 * recalcula o status pelo mesmo caminho do webhook. Não substitui os eventos.
 */
export class ReconcileAction {
  constructor(
    private readonly getBilling = new GetBillingRepository(),
    private readonly listLocal = new ListPaymentsBySubscriptionRepository(),
    private readonly upsertPayment = new UpsertPaymentRepository(),
    private readonly markMissing = new MarkMissingPaymentsDeletedRepository(),
    private readonly applyStatus = new ApplyBillingStatusRepository(),
    private readonly recompute = new RecomputeStatusAction(),
    private readonly uow = new UnitOfWork(),
  ) {}

  async execute(ctx: RequestContext): Promise<ReconcileSummary> {
    const billing = getBillingAdapter();
    if (billing.provider !== BillingProvider.ASAAS) return SKIPPED;

    const sub = await this.getBilling.execute(ctx);
    if (!sub?.externalSubscriptionId || sub.billingProvider !== BillingProvider.ASAAS) return SKIPPED;

    const [remoteSub, remotePayments] = await Promise.all([
      billing.getSubscription(sub.externalSubscriptionId),
      billing.listSubscriptionPayments(sub.externalSubscriptionId),
    ]);

    let divergences = 0;
    let recompute: RecomputeResult = { changed: false, from: sub.status, to: sub.status, readOnly: false, paidNow: false };

    await this.uow.run(ctx, async ({ tx, publish }) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`asaas-billing:${ctx.tenantId}`}))`;

      const local = new Map(
        (await this.listLocal.execute(tx, sub.id)).map((p) => [p.externalPaymentId, p.status] as const),
      );
      for (const payment of remotePayments) {
        if (local.get(payment.id) !== payment.status) divergences += 1;
        await this.upsertPayment.execute(tx, { tenantId: ctx.tenantId, subscriptionId: sub.id, payment });
      }
      divergences += await this.markMissing.execute(
        tx,
        sub.id,
        remotePayments.map((p) => p.id),
      );

      if (remoteSub.deleted && sub.status !== SubscriptionStatus.CANCELLED) {
        divergences += 1;
        await this.applyStatus.execute(tx, {
          tenantId: ctx.tenantId,
          subscriptionId: sub.id,
          status: SubscriptionStatus.CANCELLED,
          cancelAt: new Date(),
        });
        publish([
          { name: 'subscription.subscription_cancelled', payload: { subscriptionId: sub.id, from: sub.status } },
        ]);
        recompute = { changed: true, from: sub.status, to: SubscriptionStatus.CANCELLED, readOnly: true, paidNow: false };
        return;
      }

      const outcome = await this.recompute.execute(tx, ctx.tenantId);
      publish(outcome.events);
      recompute = outcome.result;
    });

    if (divergences > 0 || recompute.changed) {
      logger.info(
        { tenantId: ctx.tenantId, divergences, from: recompute.from, to: recompute.to },
        'asaas_reconciled',
      );
      await writeAuditLogSafe({
        tenantId: ctx.tenantId,
        actorType: 'SYSTEM',
        action: AuditAction.SUBSCRIPTION_RECONCILED,
        resourceType: 'subscription',
        resourceId: sub.id,
        metadata: { divergences, from: recompute.from, to: recompute.to },
      });
    }
    if (recompute.changed && recompute.readOnly) await disableAllAutomations(ctx);

    return {
      checked: true,
      divergences,
      statusFrom: recompute.changed ? recompute.from : sub.status,
      statusTo: recompute.changed ? recompute.to : sub.status,
    };
  }
}
