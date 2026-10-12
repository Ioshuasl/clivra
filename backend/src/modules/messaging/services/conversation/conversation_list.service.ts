import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { ListRepository } from '../../repositories/conversation/conversation_list.repository.js';
import type { ConversationListQuerySchema } from '../../schemas/conversation.schema.js';
import type { ConversationListResult } from '../../types/conversation/conversation.types.js';

export class ListService {
  constructor(private readonly list = new ListRepository()) {}

  execute(ctx: RequestContext, conversationSchema: ConversationListQuerySchema): Promise<ConversationListResult> {
    return this.list.execute(ctx, {
      status: conversationSchema.status,
      patientId: conversationSchema.patientId,
      q: conversationSchema.q,
      unread: conversationSchema.unread,
      cursor: conversationSchema.cursor,
      limit: conversationSchema.limit,
    });
  }
}
