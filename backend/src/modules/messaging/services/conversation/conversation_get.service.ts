import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { ConversationNotFoundError } from '../../models/errors/messaging.errors.js';
import { GetRepository } from '../../repositories/conversation/conversation_get.repository.js';
import type { ConversationSummary } from '../../types/messaging.types.js';

export class GetService {
  constructor(private readonly get = new GetRepository()) {}

  async execute(ctx: RequestContext, conversationId: string): Promise<ConversationSummary> {
    const row = await this.get.execute(ctx, conversationId);
    if (!row) throw new ConversationNotFoundError();
    return row;
  }
}
