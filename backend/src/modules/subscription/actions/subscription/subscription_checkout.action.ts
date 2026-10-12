import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { env } from '../../../../shared/config/env.js';
import { AuditAction, writeAuditLogSafe } from '../../../../shared/database/write_audit.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import { getBillingAdapter } from '../../adapters/billing_adapter.factory.js';
import { BillingMethod } from '../../enum/billing/billing_method.enum.js';
import { BillingProvider } from '../../enum/billing/billing_provider.enum.js';
import { CheckoutStatus, PaymentStatus } from '../../enum/billing/payment_status.enum.js';
import { SubscriptionStatus } from '../../enum/subscription/subscription_status.enum.js';
import { civilDateIn, maxCivilDate } from '../../helpers/billing_date.helper.js';
import {
  BillingGatewayError,
  BillingIdempotencyKeyReusedError,
  BillingMisconfiguredError,
  BillingUnavailableError,
  PlanNotFoundError,
  SubscriptionAlreadyActiveError,
  SubscriptionNotFoundError,
} from '../../models/errors/subscription.errors.js';
import { AsaasLinkRepository } from '../../repositories/asaas_link/asaas_link.repository.js';
import { GetCheckoutByIdempotencyRepository } from '../../repositories/checkout/checkout_get_by_idempotency.repository.js';
import { ReserveCheckoutRepository } from '../../repositories/checkout/checkout_reserve.repository.js';
import { UpdateCheckoutRepository } from '../../repositories/checkout/checkout_update.repository.js';
import { UpsertPaymentRepository } from '../../repositories/payment/payment_upsert.repository.js';
import { GetByCodeRepository } from '../../repositories/plan/plan_get.repository.js';
import { GetBillingProfileRepository } from '../../repositories/subscription/billing_profile_get.repository.js';
import { GetBillingRepository } from '../../repositories/subscription/subscription_billing_get.repository.js';
import { SetBillingRepository } from '../../repositories/subscription/subscription_billing_set.repository.js';
import type { CheckoutBodySchema } from '../../schemas/subscription.schema.js';
import type { CheckoutPaymentView, CheckoutResult } from '../../types/billing/checkout.types.js';
import type { BillingPayment } from '../../types/billing/billing.types.js';
import type {
  BillingProfile,
  SubscriptionBillingRow,
  SubscriptionCheckoutRow,
} from '../../types/billing/subscription_payment.types.js';
import type { PlanSummary } from '../../types/subscription.types.js';
import { PlanLimitGuard } from '../../services/plan_limit/plan_limit_guard.service.js';

const CARD_CHECKOUT_MINUTES = 60;

function digits(value: string | null | undefined): string | null {
  const only = (value ?? '').replace(/\D/g, '');
  return only.length > 0 ? only : null;
}

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return code === 'P2002' || code === '23505';
}

/** Primeira cobrança em aberto (a de menor vencimento) entre as não removidas. */
function pickOpenPayment(payments: BillingPayment[]): BillingPayment | undefined {
  return payments
    .filter(
      (p) =>
        !p.deleted && (p.status === PaymentStatus.PENDING || p.status === PaymentStatus.OVERDUE),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
}

/**
 * Checkout da assinatura (ADR-0017): Pix/boleto pela API (exibidos no app) e cartão via Asaas Checkout.
 * Idempotente por `Idempotency-Key`; timeout no gateway deixa a tentativa PENDING para retomar com a mesma chave.
 */
export class CheckoutAction {
  constructor(
    private readonly getBilling = new GetBillingRepository(),
    private readonly getProfile = new GetBillingProfileRepository(),
    private readonly getPlan = new GetByCodeRepository(),
    private readonly getByIdempotency = new GetCheckoutByIdempotencyRepository(),
    private readonly reserve = new ReserveCheckoutRepository(),
    private readonly updateCheckout = new UpdateCheckoutRepository(),
    private readonly upsertPayment = new UpsertPaymentRepository(),
    private readonly setBilling = new SetBillingRepository(),
    private readonly links = new AsaasLinkRepository(),
    private readonly planLimits = new PlanLimitGuard(),
    private readonly uow = new UnitOfWork(),
  ) {}

  async execute(
    ctx: RequestContext,
    checkoutSchema: CheckoutBodySchema,
    idempotencyKey: string,
  ): Promise<CheckoutResult> {
    const billing = getBillingAdapter();
    if (billing.provider !== BillingProvider.ASAAS) throw new BillingUnavailableError();

    const sub = await this.getBilling.execute(ctx);
    if (!sub) throw new SubscriptionNotFoundError();
    if (sub.status === SubscriptionStatus.ACTIVE || sub.status === SubscriptionStatus.PAST_DUE) {
      throw new SubscriptionAlreadyActiveError(sub.status);
    }

    const plan = await this.getPlan.execute(checkoutSchema.planCode);
    if (!plan || !plan.active) throw new PlanNotFoundError();

    const attempt = await this.reserveAttempt(ctx, idempotencyKey, plan, checkoutSchema);
    if (attempt.complete) return attempt.complete;

    await this.planLimits.assertFitsPlan(ctx, plan);
    const profile = await this.getProfile.execute(ctx);
    if (!profile) throw new SubscriptionNotFoundError();

    try {
      return await this.runGatewayFlow(ctx, billing, sub, profile, plan, attempt.row, checkoutSchema);
    } catch (err) {
      // Falha definitiva libera a mesma chave para nova tentativa; inconclusiva mantém PENDING.
      const inconclusive = err instanceof BillingGatewayError && err.details && (err.details as { inconclusive?: boolean }).inconclusive === true;
      if (!inconclusive) {
        await getTenantPrisma().runInTenantContext(ctx, (tx) =>
          this.updateCheckout.execute(tx, attempt.row.id, { status: CheckoutStatus.FAILED }),
        );
      }
      throw err;
    }
  }

  /** Reserva a tentativa ou devolve o resultado da já concluída (replay). */
  private async reserveAttempt(
    ctx: RequestContext,
    key: string,
    plan: PlanSummary,
    body: CheckoutBodySchema,
  ): Promise<{ row: SubscriptionCheckoutRow; complete?: CheckoutResult }> {
    const db = getTenantPrisma();
    const found = await db.runInTenantContext(ctx, async (tx) => {
      const existing = await this.getByIdempotency.execute(tx, ctx.tenantId, key);
      if (existing) return existing;
      try {
        return await this.reserve.execute(tx, {
          tenantId: ctx.tenantId,
          idempotencyKey: key,
          planId: plan.id,
          billingMethod: body.billingMethod,
        });
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        return null;
      }
    });
    const row =
      found ??
      (await db.runInTenantContext(ctx, (tx) =>
        this.getByIdempotency.execute(tx, ctx.tenantId, key),
      ));
    if (!row) throw new BillingGatewayError(false);

    if (row.planId !== plan.id || row.billingMethod !== body.billingMethod) {
      throw new BillingIdempotencyKeyReusedError();
    }
    const stillValid =
      row.status === CheckoutStatus.PENDING &&
      row.url !== null &&
      row.expiresAt !== null &&
      new Date(row.expiresAt).getTime() > Date.now();
    if (stillValid && row.billingMethod === BillingMethod.CREDIT_CARD && row.url) {
      return {
        row,
        complete: {
          checkoutId: row.id,
          billingMethod: row.billingMethod,
          status: row.status,
          redirectUrl: row.url,
        },
      };
    }
    if (row.status === CheckoutStatus.FAILED) {
      await db.runInTenantContext(ctx, (tx) =>
        this.updateCheckout.execute(tx, row.id, { status: CheckoutStatus.PENDING }),
      );
    }
    return { row };
  }

  private async runGatewayFlow(
    ctx: RequestContext,
    billing: ReturnType<typeof getBillingAdapter>,
    sub: SubscriptionBillingRow,
    profile: BillingProfile,
    plan: PlanSummary,
    checkout: SubscriptionCheckoutRow,
    body: CheckoutBodySchema,
  ): Promise<CheckoutResult> {
    const today = civilDateIn(profile.timezone);
    const trialDay =
      sub.status === SubscriptionStatus.TRIAL && sub.trialEndsAt
        ? civilDateIn(profile.timezone, sub.trialEndsAt)
        : today;
    const nextDueDate = maxCivilDate(today, trialDay);

    // Cartão: o Asaas exige endereço/telefone para aceitar `customer`; sem ele, a própria página
    // hospedada coleta os dados do pagador. O vínculo com o tenant é o id do checkout (webhook).
    if (body.billingMethod === BillingMethod.CREDIT_CARD) {
      this.assertPublicCallbackUrl();
      return this.cardFlow(ctx, billing, sub, plan, checkout, nextDueDate);
    }

    const customer = await billing.ensureCustomer({
      tenantId: ctx.tenantId,
      name: profile.legalName ?? profile.tenantName,
      email: profile.ownerEmail,
      cpfCnpj: body.cpfCnpj ?? digits(profile.taxId),
      mobilePhone: digits(profile.ownerPhone),
    });
    await this.links.upsertCustomer(ctx.tenantId, customer.customerId);

    return this.pixOrBoletoFlow(
      ctx,
      billing,
      sub,
      plan,
      checkout,
      customer.customerId,
      nextDueDate,
      body.billingMethod,
    );
  }

  /** O Asaas recusa URLs de retorno em localhost: precisa de domínio público (ver APP_PUBLIC_URL). */
  private assertPublicCallbackUrl(): void {
    if (env.ASAAS_BASE_URL) return; // gateway simulado (testes/túnel): não há validação real
    const host = new URL(env.APP_PUBLIC_URL).hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')) {
      throw new BillingMisconfiguredError('APP_PUBLIC_URL aponta para localhost');
    }
  }

  private async cardFlow(
    ctx: RequestContext,
    billing: ReturnType<typeof getBillingAdapter>,
    sub: SubscriptionBillingRow,
    plan: PlanSummary,
    checkout: SubscriptionCheckoutRow,
    nextDueDate: string,
  ): Promise<CheckoutResult> {
    const base = `${env.APP_PUBLIC_URL.replace(/\/$/, '')}/app/assinatura/retorno`;
    const created = await billing.createCardCheckout({
      valueCents: plan.priceCents,
      itemName: `Plano ${plan.name}`,
      description: `Assinatura mensal — plano ${plan.name}`,
      nextDueDate,
      externalReference: ctx.tenantId,
      minutesToExpire: CARD_CHECKOUT_MINUTES,
      callback: {
        successUrl: `${base}?status=success`,
        cancelUrl: `${base}?status=cancel`,
        expiredUrl: `${base}?status=expired`,
      },
    });

    await this.links.addCheckout(ctx.tenantId, created.checkoutId);
    await this.uow.run(ctx, async ({ tx, publish }) => {
      await this.updateCheckout.execute(tx, checkout.id, {
        externalCheckoutId: created.checkoutId,
        url: created.url,
        expiresAt: new Date(Date.now() + CARD_CHECKOUT_MINUTES * 60_000),
      });
      await this.setBilling.execute(tx, sub.id, {
        billingMethod: BillingMethod.CREDIT_CARD,
        billingProvider: BillingProvider.ASAAS,
      });
      publish([
        {
          name: 'subscription.checkout_created',
          payload: { checkoutId: checkout.id, billingMethod: BillingMethod.CREDIT_CARD, planId: plan.id },
        },
      ]);
    });
    await this.audit(ctx, checkout.id, plan, BillingMethod.CREDIT_CARD);

    return {
      checkoutId: checkout.id,
      billingMethod: BillingMethod.CREDIT_CARD,
      status: CheckoutStatus.PENDING,
      redirectUrl: created.url,
    };
  }

  private async pixOrBoletoFlow(
    ctx: RequestContext,
    billing: ReturnType<typeof getBillingAdapter>,
    sub: SubscriptionBillingRow,
    plan: PlanSummary,
    checkout: SubscriptionCheckoutRow,
    customerId: string,
    nextDueDate: string,
    method: typeof BillingMethod.PIX | typeof BillingMethod.BOLETO,
  ): Promise<CheckoutResult> {
    // Reaproveita a assinatura do Asaas quando já existe na mesma forma (retry sem duplicar).
    let subscriptionId = sub.externalSubscriptionId;
    const reusable =
      subscriptionId !== null &&
      sub.billingProvider === BillingProvider.ASAAS &&
      sub.billingMethod === method;
    if (!reusable) {
      if (subscriptionId) await billing.cancelSubscription(subscriptionId).catch(() => undefined);
      // Timeout não é falha: se uma tentativa anterior já criou a assinatura, adota em vez de duplicar.
      const already = await billing.findSubscriptionByReference(customerId, ctx.tenantId);
      if (already && already.billingType === method) {
        subscriptionId = already.id;
      } else {
        if (already) await billing.cancelSubscription(already.id).catch(() => undefined);
        const created = await billing.createSubscription({
          customerId,
          billingMethod: method,
          valueCents: plan.priceCents,
          nextDueDate,
          description: `Assinatura mensal — plano ${plan.name}`,
          externalReference: ctx.tenantId,
        });
        subscriptionId = created.subscriptionId;
      }
      await this.links.setSubscription(ctx.tenantId, subscriptionId, customerId);
    }
    if (!subscriptionId) throw new BillingGatewayError(false);

    const payments = await billing.listSubscriptionPayments(subscriptionId);
    const open = pickOpenPayment(payments);
    const view = open ? await this.buildPaymentView(billing, open, method) : undefined;

    await this.uow.run(ctx, async ({ tx, publish }) => {
      await this.setBilling.execute(tx, sub.id, {
        externalCustomerId: customerId,
        externalSubscriptionId: subscriptionId,
        billingMethod: method,
        billingProvider: BillingProvider.ASAAS,
      });
      for (const payment of payments) {
        await this.upsertPayment.execute(tx, {
          tenantId: ctx.tenantId,
          subscriptionId: sub.id,
          payment,
        });
      }
      publish([
        {
          name: 'subscription.checkout_created',
          payload: { checkoutId: checkout.id, billingMethod: method, planId: plan.id },
        },
      ]);
    });
    await this.audit(ctx, checkout.id, plan, method);

    return {
      checkoutId: checkout.id,
      billingMethod: method,
      status: CheckoutStatus.PENDING,
      payment: view,
    };
  }

  private async buildPaymentView(
    billing: ReturnType<typeof getBillingAdapter>,
    payment: BillingPayment,
    method: string,
  ): Promise<CheckoutPaymentView> {
    const view: CheckoutPaymentView = {
      id: payment.id,
      dueDate: payment.dueDate,
      valueCents: payment.valueCents,
      status: payment.status,
      invoiceUrl: payment.invoiceUrl,
    };
    if (method === BillingMethod.PIX) {
      const qr = await billing.getPixQrCode(payment.id);
      view.pix = { qrCodeBase64: qr.encodedImage, payload: qr.payload, expiresAt: qr.expirationDate };
    } else {
      const boleto = await billing.getBoleto(payment.id);
      view.boleto = { digitableLine: boleto.identificationField, url: boleto.bankSlipUrl };
    }
    return view;
  }

  private async audit(
    ctx: RequestContext,
    checkoutId: string,
    plan: PlanSummary,
    method: string,
  ): Promise<void> {
    await writeAuditLogSafe({
      tenantId: ctx.tenantId,
      actorId: ctx.userId || undefined,
      action: AuditAction.SUBSCRIPTION_CHECKOUT_CREATED,
      resourceType: 'subscription_checkout',
      resourceId: checkoutId,
      metadata: { planCode: plan.code, billingMethod: method },
    });
  }
}
