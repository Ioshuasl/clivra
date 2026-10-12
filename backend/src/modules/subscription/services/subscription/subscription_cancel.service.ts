import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { CancelAction } from '../../actions/subscription/subscription_cancel.action.js';
import type { CancelBodySchema } from '../../schemas/subscription.schema.js';

export class CancelService {
  constructor(private readonly action = new CancelAction()) {}

  async execute(ctx: RequestContext, cancelSchema: CancelBodySchema): Promise<{ status: string }> {
    return this.action.execute(ctx, cancelSchema);
  }
}
