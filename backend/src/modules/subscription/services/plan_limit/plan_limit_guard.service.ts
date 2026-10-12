import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { PlanLimitExceededError } from '../../models/errors/subscription.errors.js';
import { UsageMetric } from '../../enum/usage/usage_metric.enum.js';
import { storageLimitBytes } from '../../helpers/plan_limits.helper.js';
import { GetRepository as SubscriptionGetRepository } from '../../repositories/subscription/subscription_get.repository.js';
import { CountLiveRepository } from '../../repositories/usage/usage_count_live.repository.js';
import type { PlanLimits } from '../../types/subscription.types.js';

function limitForMetric(limits: PlanLimits, metric: UsageMetric): number | null {
  switch (metric) {
    case UsageMetric.PROFESSIONALS:
      return limits.professionals;
    case UsageMetric.ADMIN_USERS:
      return limits.adminUsers;
    case UsageMetric.UNITS:
      return limits.units;
    case UsageMetric.STORAGE_BYTES:
      return storageLimitBytes(limits);
    case UsageMetric.MESSAGES_MONTH:
      return limits.messagesMonth;
    case UsageMetric.PATIENTS:
      return null;
    default:
      return null;
  }
}

export class PlanLimitGuard {
  constructor(
    private readonly subscriptionGet = new SubscriptionGetRepository(),
    private readonly countLive = new CountLiveRepository(),
  ) {}

  async assertCanAdd(
    ctx: RequestContext,
    metric: UsageMetric,
    amount = 1,
  ): Promise<void> {
    const sub = await this.subscriptionGet.execute(ctx);
    if (!sub) return;

    const limit = limitForMetric(sub.plan.limits, metric);
    if (limit === null) return;

    const current = await this.countLive.execute(ctx, metric);
    if (current + amount > limit) {
      throw new PlanLimitExceededError(metric, limit, current);
    }
  }

  /** Troca de plano: o uso atual precisa caber nos limites do plano alvo (RF-E10-12). */
  async assertFitsPlan(ctx: RequestContext, target: { limits: PlanLimits }): Promise<void> {
    const metrics: UsageMetric[] = [
      UsageMetric.PROFESSIONALS,
      UsageMetric.ADMIN_USERS,
      UsageMetric.UNITS,
      UsageMetric.STORAGE_BYTES,
    ];
    for (const metric of metrics) {
      const limit = limitForMetric(target.limits, metric);
      if (limit === null) continue;
      const current = await this.countLive.execute(ctx, metric);
      if (current > limit) throw new PlanLimitExceededError(metric, limit, current);
    }
  }

  async getUsage(
    ctx: RequestContext,
    metric: UsageMetric,
  ): Promise<{ limit: number | null; current: number }> {
    const sub = await this.subscriptionGet.execute(ctx);
    const current = await this.countLive.execute(ctx, metric);
    if (!sub) return { limit: null, current };
    return { limit: limitForMetric(sub.plan.limits, metric), current };
  }
}
