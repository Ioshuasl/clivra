import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { CheckoutAction } from '../../actions/subscription/subscription_checkout.action.js';
import { BillingIdempotencyKeyRequiredError } from '../../models/errors/subscription.errors.js';
import type { CheckoutBodySchema } from '../../schemas/subscription.schema.js';
import type { CheckoutResult } from '../../types/billing/checkout.types.js';

const MAX_KEY_LENGTH = 200;

export class CheckoutService {
  constructor(private readonly action = new CheckoutAction()) {}

  async execute(
    ctx: RequestContext,
    checkoutSchema: CheckoutBodySchema,
    idempotencyKey: string | undefined,
  ): Promise<CheckoutResult> {
    const key = idempotencyKey?.trim();
    if (!key || key.length > MAX_KEY_LENGTH) throw new BillingIdempotencyKeyRequiredError();
    return this.action.execute(ctx, checkoutSchema, key);
  }
}
