import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { env } from '../../../../shared/config/env.js';
import { logger } from '../../../../shared/config/logger.js';
import { AuditAction, writeAuditLogSafe } from '../../../../shared/database/write_audit.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import { getEmailProvider } from '../../../../shared/integrations/email/index.js';
import { disableAllAutomations } from '../../../messaging/messaging_public.js';
import { BillingProvider } from '../../enum/billing/billing_provider.enum.js';
import { PaymentStatus } from '../../enum/billing/payment_status.enum.js';
import { SubscriptionStatus } from '../../enum/subscription/subscription_status.enum.js';
import { civilDateIn, daysBetweenCivil } from '../../helpers/billing_date.helper.js';
import { GetBillingProfileRepository } from '../../repositories/subscription/billing_profile_get.repository.js';
import { PAST_DUE_GRACE_DAYS } from '../../models/subscription/billing_state.model.js';
import { ListPaymentsBySubscriptionRepository } from '../../repositories/payment/payment_list_by_subscription.repository.js';
import { ApplyBillingStatusRepository } from '../../repositories/subscription/subscription_billing_apply_status.repository.js';
import { GetBillingRepository } from '../../repositories/subscription/subscription_billing_get.repository.js';

/**
 * PAST_DUE → SUSPENDED após 7 dias da cobrança vencida em aberto (módulo 10 §3).
 * Só assinaturas cobradas pelo Asaas: a manual continua sob controle da operação.
 */
export class SuspendPastDueAction {
  constructor(
    private readonly getBilling = new GetBillingRepository(),
    private readonly listPayments = new ListPaymentsBySubscriptionRepository(),
    private readonly applyStatus = new ApplyBillingStatusRepository(),
    private readonly getProfile = new GetBillingProfileRepository(),
    private readonly uow = new UnitOfWork(),
  ) {}

  async execute(ctx: RequestContext): Promise<{ suspended: boolean }> {
    const suspended = await this.uow.run(ctx, async ({ tx, publish }) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`asaas-billing:${ctx.tenantId}`}))`;
      const sub = await this.getBilling.executeInTx(tx, ctx.tenantId);
      if (
        !sub ||
        sub.status !== SubscriptionStatus.PAST_DUE ||
        sub.billingProvider !== BillingProvider.ASAAS
      ) {
        return null;
      }
      const today = civilDateIn(sub.timezone);
      const oldestOverdue = (await this.listPayments.execute(tx, sub.id))
        .filter((p) => !p.deleted && p.status === PaymentStatus.OVERDUE)
        .map((p) => p.dueDate)
        .sort()[0];
      if (!oldestOverdue || daysBetweenCivil(oldestOverdue, today) < PAST_DUE_GRACE_DAYS) return null;

      await this.applyStatus.execute(tx, {
        tenantId: ctx.tenantId,
        subscriptionId: sub.id,
        status: SubscriptionStatus.SUSPENDED,
      });
      publish([
        { name: 'subscription.subscription_suspended', payload: { subscriptionId: sub.id, since: oldestOverdue } },
      ]);
      return sub.id;
    });

    if (!suspended) return { suspended: false };
    await disableAllAutomations(ctx);
    await writeAuditLogSafe({
      tenantId: ctx.tenantId,
      actorType: 'SYSTEM',
      action: AuditAction.SUBSCRIPTION_STATUS_CHANGED,
      resourceType: 'subscription',
      resourceId: suspended,
      metadata: { status: SubscriptionStatus.SUSPENDED, from: SubscriptionStatus.PAST_DUE, source: 'past-due-job' },
    });
    await this.notifyOwner(ctx);
    return { suspended: true };
  }

  private async notifyOwner(ctx: RequestContext): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      const profile = await this.getProfile.execute(ctx);
      if (!profile) return;
      await getEmailProvider().send({
        to: profile.ownerEmail,
        subject: 'Sua assinatura foi suspensa (somente leitura)',
        text: 'Não identificamos o pagamento da sua assinatura. Seus dados continuam disponíveis para leitura e exportação; regularize em Assinatura para voltar a editar.',
      });
    } catch (err) {
      logger.warn({ err, tenantId: ctx.tenantId }, 'asaas_suspend_email_failed');
    }
  }
}
