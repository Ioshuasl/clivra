import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { ListPaymentsPageRepository } from '../../repositories/payment/payment_list_page.repository.js';
import type { PaymentListQuerySchema } from '../../schemas/subscription.schema.js';
import type { SubscriptionPaymentRow } from '../../types/billing/subscription_payment.types.js';

export class ListService {
  constructor(private readonly list = new ListPaymentsPageRepository()) {}

  async execute(
    ctx: RequestContext,
    paymentQuerySchema: PaymentListQuerySchema,
  ): Promise<{ items: SubscriptionPaymentRow[]; nextCursor: string | null }> {
    return this.list.execute(ctx, paymentQuerySchema);
  }
}
