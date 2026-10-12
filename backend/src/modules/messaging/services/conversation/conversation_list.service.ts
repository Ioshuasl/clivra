import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { ListRepository } from '../../repositories/conversation/conversation_list.repository.js';
import type { ConversationListQuerySchema } from '../../schemas/messaging.schema.js';
import type { ConversationList } from '../../types/messaging.types.js';

export class ListService {
  constructor(private readonly list = new ListRepository()) {}

  async execute(ctx: RequestContext, query: ConversationListQuerySchema): Promise<ConversationList> {
    return this.list.execute(ctx, {
      status: query.status,
      patientId: query.patientId,
      q: query.q,
      unread: query.unread,
      cursor: query.cursor,
      limit: query.limit,
    });
  }
}
