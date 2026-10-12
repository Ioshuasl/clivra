import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { messagingSseHub } from '../../helpers/sse_hub.helper.js';
import { ConversationNotFoundError } from '../../models/errors/messaging.errors.js';
import { MarkReadRepository } from '../../repositories/conversation/conversation_mark_read.repository.js';
import type { ConversationSummary } from '../../types/messaging.types.js';

export class MarkReadService {
  constructor(private readonly markRead = new MarkReadRepository()) {}

  async execute(ctx: RequestContext, conversationId: string): Promise<ConversationSummary> {
    const row = await this.markRead.execute(ctx, conversationId);
    if (!row) throw new ConversationNotFoundError();
    messagingSseHub.publish(ctx.tenantId, {
      type: 'unread_updated',
      data: {
        conversationId: row.id,
        unreadCount: row.unreadCount,
      },
    });
    return row;
  }
}
