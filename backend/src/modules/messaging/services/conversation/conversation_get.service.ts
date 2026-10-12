import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { buildConversationContextActions } from '../../helpers/conversation_context_actions.helper.js';
import { GetRepository } from '../../repositories/conversation/conversation_get.repository.js';
import { ConversationNotFoundError } from '../../models/errors/messaging.errors.js';
import type { ConversationDetail } from '../../types/conversation/conversation.types.js';

export class GetService {
  constructor(private readonly get = new GetRepository()) {}

  async execute(ctx: RequestContext, conversationId: string): Promise<ConversationDetail> {
    const conversation = await this.get.execute(ctx, conversationId);
    if (!conversation) throw new ConversationNotFoundError();
    return {
      ...conversation,
      contextActions: conversation.patientId
        ? buildConversationContextActions(conversation.patientId)
        : [],
    };
  }
}
