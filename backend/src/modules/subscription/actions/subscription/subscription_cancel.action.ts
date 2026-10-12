import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { AuditAction, writeAuditLogSafe } from '../../../../shared/database/write_audit.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import { disableAllAutomations } from '../../../messaging/messaging_public.js';
import { getBillingAdapter } from '../../adapters/billing_adapter.factory.js';
import { BillingProvider } from '../../enum/billing/billing_provider.enum.js';
import { SubscriptionStatus } from '../../enum/subscription/subscription_status.enum.js';
import {
  BillingUnavailableError,
  NoBillingSubscriptionError,
  SubscriptionNotFoundError,
} from '../../models/errors/subscription.errors.js';
import { ApplyBillingStatusRepository } from '../../repositories/subscription/subscription_billing_apply_status.repository.js';
import { GetBillingRepository } from '../../repositories/subscription/subscription_billing_get.repository.js';
import { SetBillingRepository } from '../../repositories/subscription/subscription_billing_set.repository.js';
import type { CancelBodySchema } from '../../schemas/subscription.schema.js';

/**
 * Cancela a recorrência no Asaas.
 * - Durante o teste (TRIAL): só desfaz a cobrança agendada; a clínica continua no teste.
 * - Assinatura paga (ACTIVE/PAST_DUE): leva a CANCELLED (somente leitura).
 * Atenção: o DELETE do Asaas remove as cobranças pendentes e vencidas (a UI confirma antes).
 */
export class CancelAction {
  constructor(
    private readonly getBilling = new GetBillingRepository(),
    private readonly applyStatus = new ApplyBillingStatusRepository(),
    private readonly setBilling = new SetBillingRepository(),
    private readonly uow = new UnitOfWork(),
  ) {}

  async execute(ctx: RequestContext, cancelSchema: CancelBodySchema): Promise<{ status: string }> {
    const billing = getBillingAdapter();
    if (billing.provider !== BillingProvider.ASAAS) throw new BillingUnavailableError();

    const sub = await this.getBilling.execute(ctx);
    if (!sub) throw new SubscriptionNotFoundError();
    if (sub.status === SubscriptionStatus.CANCELLED) return { status: sub.status };
    if (!sub.externalSubscriptionId) throw new NoBillingSubscriptionError();

    await billing.cancelSubscription(sub.externalSubscriptionId);

    if (sub.status === SubscriptionStatus.TRIAL) {
      await this.uow.run(ctx, async ({ tx }) => {
        // Zera a recorrência local: o SUBSCRIPTION_DELETED que o Asaas enviar depois não corresponde a mais nada.
        await this.setBilling.execute(tx, sub.id, { externalSubscriptionId: null, billingMethod: null });
      });
      await writeAuditLogSafe({
        tenantId: ctx.tenantId,
        actorId: ctx.userId || undefined,
        action: AuditAction.SUBSCRIPTION_CANCELLED,
        resourceType: 'subscription',
        resourceId: sub.id,
        metadata: { from: sub.status, trial: true, reason: cancelSchema.reason ?? null },
      });
      return { status: SubscriptionStatus.TRIAL };
    }

    await this.uow.run(ctx, async ({ tx, publish }) => {
      await this.applyStatus.execute(tx, {
        tenantId: ctx.tenantId,
        subscriptionId: sub.id,
        status: SubscriptionStatus.CANCELLED,
        cancelAt: new Date(),
      });
      publish([
        {
          name: 'subscription.subscription_cancelled',
          payload: { subscriptionId: sub.id, from: sub.status },
        },
      ]);
    });
    await disableAllAutomations(ctx);
    await writeAuditLogSafe({
      tenantId: ctx.tenantId,
      actorId: ctx.userId || undefined,
      action: AuditAction.SUBSCRIPTION_CANCELLED,
      resourceType: 'subscription',
      resourceId: sub.id,
      metadata: { from: sub.status, reason: cancelSchema.reason ?? null },
    });
    return { status: SubscriptionStatus.CANCELLED };
  }
}
