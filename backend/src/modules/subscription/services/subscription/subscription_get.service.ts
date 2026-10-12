import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { isAsaasEnabled } from '../../adapters/billing_adapter.factory.js';
import { SubscriptionNotFoundError } from '../../models/errors/subscription.errors.js';
import { GetRepository } from '../../repositories/subscription/subscription_get.repository.js';
import type { SubscriptionSummary } from '../../types/subscription.types.js';

export class GetService {
  constructor(private readonly get = new GetRepository()) {}

  /** `checkoutAvailable`: o pagamento online está ligado (BILLING_PROVIDER=asaas). */
  async execute(ctx: RequestContext): Promise<SubscriptionSummary & { checkoutAvailable: boolean }> {
    const row = await this.get.execute(ctx);
    if (!row) throw new SubscriptionNotFoundError();
    return { ...row, checkoutAvailable: isAsaasEnabled() };
  }
}
