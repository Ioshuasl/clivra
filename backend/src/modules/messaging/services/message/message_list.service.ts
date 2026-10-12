import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { ConversationNotFoundError } from '../../models/errors/messaging.errors.js';
import { GetRepository as GetConversationRepository } from '../../repositories/conversation/conversation_get.repository.js';
import { ListRepository } from '../../repositories/message/message_list.repository.js';
import type { ConversationMessageListQuerySchema } from '../../schemas/conversation.schema.js';
import type { MessageListResult } from '../../types/message/message.types.js';

export class ListService {
  constructor(
    private readonly getConversation = new GetConversationRepository(),
    private readonly list = new ListRepository(),
  ) {}

  async execute(
    ctx: RequestContext,
    conversationId: string,
    conversationMessageSchema: ConversationMessageListQuerySchema,
  ): Promise<MessageListResult> {
    const conversation = await this.getConversation.execute(ctx, conversationId);
    if (!conversation) throw new ConversationNotFoundError();
    return this.list.execute(ctx, conversationId, {
      cursor: conversationMessageSchema.cursor,
      limit: conversationMessageSchema.limit,
    });
  }
}
