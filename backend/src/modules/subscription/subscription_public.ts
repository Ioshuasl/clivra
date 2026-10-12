import type { DbTransaction } from '../../shared/database/db_transaction.js';
import type { RequestContext } from '../../shared/domain/request_context.js';
import { DEFAULT_PLAN_ID } from './enum/plan/plan_code.enum.js';
import { SubscriptionStatus } from './enum/subscription/subscription_status.enum.js';
import { UsageMetric } from './enum/usage/usage_metric.enum.js';
import { asyncSubscriptionGuard } from './middlewares/subscription_guard.middleware.js';
import { AsaasLinkRepository } from './repositories/asaas_link/asaas_link.repository.js';
import { CreateRepository } from './repositories/subscription/subscription_create.repository.js';
import { PlanLimitGuard } from './services/plan_limit/plan_limit_guard.service.js';
import { AssertWritableService } from './services/subscription/subscription_assert_writable.service.js';

const createSubscription = new CreateRepository();
const planLimitGuard = new PlanLimitGuard();
const assertWritable = new AssertWritableService();
const asaasLinks = new AsaasLinkRepository();

export type SeedSubscriptionInput = {
  tenantId: string;
  trialEndsAt: Date | null;
  idNext: () => string;
  planId?: string;
};

/** Cria subscription TRIAL no plano Essencial (signup / backfill programático). */
export async function seedSubscriptionOnSignup(
  tx: DbTransaction,
  input: SeedSubscriptionInput,
): Promise<void> {
  await createSubscription.execute(tx, {
    id: input.idNext(),
    tenantId: input.tenantId,
    planId: input.planId ?? DEFAULT_PLAN_ID,
    status: SubscriptionStatus.TRIAL,
    trialEndsAt: input.trialEndsAt,
  });
}

export async function assertPlanLimit(
  ctx: RequestContext,
  metric: UsageMetric,
  amount = 1,
): Promise<void> {
  await planLimitGuard.assertCanAdd(ctx, metric, amount);
}

/** Alias público — alguns consumidores usam o nome do método do PlanLimitGuard. */
export async function assertCanAdd(
  ctx: RequestContext,
  metric: UsageMetric,
  amount = 1,
): Promise<void> {
  await assertPlanLimit(ctx, metric, amount);
}

export async function assertSubscriptionWritable(ctx: RequestContext): Promise<void> {
  await assertWritable.execute(ctx);
}

/** Automação (WhatsApp/jobs) só com assinatura gravável (não read-only / trial vencido). */
export async function canAutomate(ctx: RequestContext): Promise<boolean> {
  return !(await assertWritable.isReadOnly(ctx));
}

/** Tenants com cobrança recorrente no Asaas (agendador do worker: reconciliação e suspensão). */
export async function listTenantsWithAsaasSubscription(): Promise<string[]> {
  return asaasLinks.listTenantsWithSubscription();
}

export { asyncSubscriptionGuard, UsageMetric, PlanLimitGuard };

export type { PlanSummary, SubscriptionSummary, UsageSummary } from './types/subscription.types.js';
