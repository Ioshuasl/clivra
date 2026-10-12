import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import type { DomainEvent } from '../../../../shared/domain/domain_event.js';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { env } from '../../../../shared/config/env.js';
import { logger } from '../../../../shared/config/logger.js';
import { AuditAction, writeAuditLogSafe } from '../../../../shared/database/write_audit.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import { getEmailProvider } from '../../../../shared/integrations/email/index.js';
import {
  asaasPaymentSchema,
  asaasWebhookBodySchema,
  type AsaasWebhookBody,
} from '../../../../shared/integrations/asaas/asaas.types.js';
import { disableAllAutomations } from '../../../messaging/messaging_public.js';
import { mapAsaasPayment } from '../../adapters/asaas_billing.adapter.js';
import { BillingMethod } from '../../enum/billing/billing_method.enum.js';
import { BillingProvider } from '../../enum/billing/billing_provider.enum.js';
import { CheckoutStatus } from '../../enum/billing/payment_status.enum.js';
import {
  READ_ONLY_SUBSCRIPTION_STATUSES,
  SubscriptionStatus,
} from '../../enum/subscription/subscription_status.enum.js';
import { AsaasEventRepository } from '../../repositories/asaas_event/asaas_event.repository.js';
import { AsaasLinkRepository } from '../../repositories/asaas_link/asaas_link.repository.js';
import { UpdateCheckoutRepository } from '../../repositories/checkout/checkout_update.repository.js';
import { UpsertPaymentRepository } from '../../repositories/payment/payment_upsert.repository.js';
import { GetBillingProfileRepository } from '../../repositories/subscription/billing_profile_get.repository.js';
import { ApplyBillingStatusRepository } from '../../repositories/subscription/subscription_billing_apply_status.repository.js';
import { GetBillingRepository } from '../../repositories/subscription/subscription_billing_get.repository.js';
import { SetBillingRepository } from '../../repositories/subscription/subscription_billing_set.repository.js';
import type { RecomputeResult } from '../../types/billing/checkout.types.js';
import type { SubscriptionBillingRow } from '../../types/billing/subscription_payment.types.js';
import { RecomputeStatusAction } from './subscription_recompute_status.action.js';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Quanto tempo um evento sem tenant espera por um vínculo antes de ser descartado. */
const UNRESOLVED_GRACE_MS = 24 * 3_600_000;

type Outcome = { result: RecomputeResult; events: DomainEvent[] };

/** Todas as strings do payload (profundidade limitada), sem as muito curtas/longas para não ser caro. */
function collectStrings(value: unknown, depth = 0, out: string[] = []): string[] {
  if (depth > 6) return out;
  if (typeof value === 'string') {
    if (value.length >= 8 && value.length <= 80) out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, depth + 1, out);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) collectStrings(item, depth + 1, out);
  }
  return out;
}

const NO_CHANGE: RecomputeResult = { changed: false, from: '', to: '', readOnly: false, paidNow: false };

function textOf(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Processa um evento do webhook já persistido em `platform.asaas_event` (idempotência garantida na entrada).
 * Atualiza o espelho de cobranças e recalcula o status — nunca confia na ordem de chegada.
 */
export class ProcessAsaasEventAction {
  constructor(
    private readonly events = new AsaasEventRepository(),
    private readonly links = new AsaasLinkRepository(),
    private readonly getBilling = new GetBillingRepository(),
    private readonly upsertPayment = new UpsertPaymentRepository(),
    private readonly setBilling = new SetBillingRepository(),
    private readonly applyStatus = new ApplyBillingStatusRepository(),
    private readonly updateCheckout = new UpdateCheckoutRepository(),
    private readonly recompute = new RecomputeStatusAction(),
    private readonly getProfile = new GetBillingProfileRepository(),
    private readonly uow = new UnitOfWork(),
  ) {}

  async execute(eventRowId: string): Promise<void> {
    const row = await this.events.get(eventRowId);
    if (!row || row.status === 'DONE') return;

    const parsed = asaasWebhookBodySchema.safeParse(row.payload);
    if (!parsed.success) {
      logger.warn({ eventRowId, event: row.event }, 'asaas_event_invalid_payload');
      await this.events.markDone(row.id, null);
      return;
    }
    const body = parsed.data;

    const tenantId = row.tenantId ?? (await this.resolveTenant(body));
    if (!tenantId) {
      // O vínculo pode aparecer depois (ex.: SUBSCRIPTION_CREATED do checkout de cartão chega depois do PAYMENT_CREATED):
      // mantém PENDING e o varredor tenta de novo. Passada a janela, descarta (evento de outra conta/ruído).
      const ageMs = Date.now() - new Date(row.receivedAt).getTime();
      if (ageMs < UNRESOLVED_GRACE_MS) {
        logger.info({ eventRowId, event: body.event }, 'asaas_event_waiting_link');
        return;
      }
      logger.warn({ eventRowId, event: body.event }, 'asaas_event_tenant_unresolved');
      await this.events.markDone(row.id, null);
      return;
    }

    const ctx: RequestContext = { tenantId, userId: SYSTEM_USER_ID, requestId: `asaas:${row.asaasEventId}` };
    let outcome: Outcome;
    try {
      outcome = await this.uow.run(ctx, async ({ tx, publish }) => {
        // Serializa eventos do mesmo tenant: dois workers não decidem o status ao mesmo tempo.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`asaas-billing:${tenantId}`}))`;
        const sub = await this.getBilling.executeInTx(tx, tenantId);
        if (!sub) return { result: NO_CHANGE, events: [] };

        const forced = await this.applyEvent(tx, sub, body);
        const outcomeInTx = forced ?? (await this.recompute.execute(tx, tenantId));
        publish(outcomeInTx.events);
        return outcomeInTx;
      });
      await this.events.markDone(row.id, tenantId);
    } catch (err) {
      await this.events.markFailed(row.id, err instanceof Error ? err.message : 'unknown');
      throw err;
    }

    await this.afterCommit(ctx, body, outcome.result);
  }

  private async resolveTenant(body: AsaasWebhookBody): Promise<string | null> {
    const subscriptionId = textOf(body.payment?.subscription) ?? textOf(body.subscription?.id);
    if (subscriptionId) {
      const found = await this.links.findTenantBySubscription(subscriptionId);
      if (found) return found;
    }
    const customerId = textOf(body.payment?.customer) ?? textOf(body.subscription?.customer);
    if (customerId) {
      const found = await this.links.findTenantByCustomer(customerId);
      if (found) return found;
    }
    for (const ref of [textOf(body.subscription?.externalReference), textOf(body.payment?.externalReference)]) {
      if (ref && UUID_RE.test(ref) && (await this.links.tenantExists(ref))) return ref;
    }
    // Checkout de cartão (sem `customer`): procura em qualquer campo do payload o id de um checkout nosso.
    // O formato dos eventos CHECKOUT_*/da assinatura criada por checkout é validado na homologação.
    for (const candidate of collectStrings(body).slice(0, 60)) {
      const found = await this.links.findTenantByCheckout(candidate);
      if (found) return found;
    }
    return null;
  }

  /** Aplica o efeito específico do evento. Devolve um resultado quando o evento decide o status sozinho. */
  private async applyEvent(
    tx: DbTransaction,
    sub: SubscriptionBillingRow,
    body: AsaasWebhookBody,
  ): Promise<Outcome | null> {
    const name = body.event;

    if (name.startsWith('PAYMENT_')) {
      const payment = asaasPaymentSchema.safeParse(body.payment);
      if (!payment.success) return null;
      // Só cobranças da assinatura (cobranças avulsas da conta não pertencem a nenhuma clínica).
      if (!payment.data.subscription) return null;
      if (sub.externalSubscriptionId && payment.data.subscription !== sub.externalSubscriptionId) {
        return null;
      }
      const mapped = mapAsaasPayment(payment.data);
      if (name === 'PAYMENT_DELETED') mapped.deleted = true;
      if (name === 'PAYMENT_RESTORED') mapped.deleted = false;
      await this.upsertPayment.execute(tx, {
        tenantId: sub.tenantId,
        subscriptionId: sub.id,
        payment: mapped,
      });
      if (name === 'PAYMENT_CHARGEBACK_REQUESTED' || name.startsWith('PAYMENT_REFUND')) {
        logger.warn({ tenantId: sub.tenantId, event: name, paymentId: mapped.id }, 'asaas_payment_needs_review');
      }
      return null;
    }

    if (name === 'SUBSCRIPTION_CREATED') {
      const subscriptionId = textOf(body.subscription?.id);
      if (subscriptionId && !sub.externalSubscriptionId) {
        await this.links.setSubscription(sub.tenantId, subscriptionId, textOf(body.subscription?.customer));
        await this.setBilling.execute(tx, sub.id, {
          externalSubscriptionId: subscriptionId,
          externalCustomerId: sub.externalCustomerId ?? textOf(body.subscription?.customer),
          billingProvider: BillingProvider.ASAAS,
          billingMethod: sub.billingMethod ?? BillingMethod.CREDIT_CARD,
        });
      }
      return null;
    }

    if (name === 'SUBSCRIPTION_DELETED') {
      if (sub.status === SubscriptionStatus.CANCELLED) return null;
      // Só cancela se for a recorrência ATUAL da clínica (cancelar durante o teste, ou trocar a forma de
      // pagamento, apaga uma recorrência antiga sem encerrar a conta).
      if (textOf(body.subscription?.id) !== sub.externalSubscriptionId) return null;
      await this.applyStatus.execute(tx, {
        tenantId: sub.tenantId,
        subscriptionId: sub.id,
        status: SubscriptionStatus.CANCELLED,
        cancelAt: new Date(),
      });
      return {
        result: {
          changed: true,
          from: sub.status,
          to: SubscriptionStatus.CANCELLED,
          readOnly: true,
          paidNow: false,
        },
        events: [
          {
            name: 'subscription.subscription_cancelled',
            payload: { subscriptionId: sub.id, from: sub.status },
          },
        ],
      };
    }

    if (name === 'SUBSCRIPTION_INACTIVATED') {
      logger.warn({ tenantId: sub.tenantId }, 'asaas_subscription_inactivated');
      return null;
    }

    if (name === 'CHECKOUT_PAID' || name === 'CHECKOUT_CANCELED' || name === 'CHECKOUT_EXPIRED') {
      const checkout = body.checkout ?? {};
      const externalId = textOf(checkout.id) ?? textOf(checkout.checkoutId);
      if (externalId) {
        const status =
          name === 'CHECKOUT_PAID'
            ? CheckoutStatus.PAID
            : name === 'CHECKOUT_CANCELED'
              ? CheckoutStatus.CANCELED
              : CheckoutStatus.EXPIRED;
        await this.updateCheckout.executeByExternalId(tx, externalId, status);
      }
      return null;
    }

    return null;
  }

  /** Efeitos fora da transação: auditoria, automações e e-mail (falha deles não desfaz o estado). */
  private async afterCommit(
    ctx: RequestContext,
    body: AsaasWebhookBody,
    result: RecomputeResult,
  ): Promise<void> {
    if (!result.changed) return;

    await writeAuditLogSafe({
      tenantId: ctx.tenantId,
      actorType: 'SYSTEM',
      action: AuditAction.SUBSCRIPTION_STATUS_CHANGED,
      resourceType: 'subscription',
      metadata: { status: result.to, from: result.from, source: 'ASAAS_WEBHOOK', event: body.event },
    });
    if (result.paidNow) {
      await writeAuditLogSafe({
        tenantId: ctx.tenantId,
        actorType: 'SYSTEM',
        action: AuditAction.SUBSCRIPTION_PAYMENT_CONFIRMED,
        resourceType: 'subscription',
        metadata: { event: body.event },
      });
    }
    if (READ_ONLY_SUBSCRIPTION_STATUSES.has(result.to)) {
      await disableAllAutomations(ctx).catch((err: unknown) => {
        logger.error({ err, tenantId: ctx.tenantId }, 'asaas_disable_automations_failed');
      });
    }
    await this.notifyOwner(ctx, result.to);
  }

  private async notifyOwner(ctx: RequestContext, status: string): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    const copy: Record<string, { subject: string; text: string }> = {
      [SubscriptionStatus.ACTIVE]: {
        subject: 'Pagamento confirmado — assinatura ativa',
        text: 'Recebemos o pagamento e sua assinatura está ativa. Obrigado!',
      },
      [SubscriptionStatus.PAST_DUE]: {
        subject: 'Pagamento pendente da sua assinatura',
        text: 'Não identificamos o pagamento da sua assinatura. Regularize em Assinatura para evitar a suspensão (somente leitura).',
      },
      [SubscriptionStatus.CANCELLED]: {
        subject: 'Assinatura cancelada',
        text: 'Sua assinatura foi cancelada. Você continua podendo ler e exportar seus dados por 90 dias.',
      },
    };
    const message = copy[status];
    if (!message) return;
    try {
      const profile = await this.getProfile.execute(ctx);
      if (!profile) return;
      await getEmailProvider().send({ to: profile.ownerEmail, ...message });
    } catch (err) {
      logger.warn({ err, tenantId: ctx.tenantId }, 'asaas_owner_email_failed');
    }
  }
}
