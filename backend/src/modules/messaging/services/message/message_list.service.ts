import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { ConversationNotFoundError } from '../../models/errors/messaging.errors.js';
import { GetRepository as GetConversationRepository } from '../../repositories/conversation/conversation_get.repository.js';
import { ListByConversationRepository } from '../../repositories/message/message_list_by_conversation.repository.js';
import type { ConversationMessagesQuerySchema } from '../../schemas/messaging.schema.js';
import type { InboxMessageList } from '../../types/messaging.types.js';

export class ListService {
  constructor(
    private readonly getConversation = new GetConversationRepository(),
    private readonly list = new ListByConversationRepository(),
  ) {}

  async execute(
    ctx: RequestContext,
    conversationId: string,
    query: ConversationMessagesQuerySchema,
  ): Promise<InboxMessageList> {
    const conversation = await this.getConversation.execute(ctx, conversationId);
    if (!conversation) throw new ConversationNotFoundError();
    return this.list.execute(ctx, conversationId, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }
}
