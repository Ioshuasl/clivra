import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { ConversationSummary } from '../../types/messaging.types.js';
import { mapConversation } from './mappers/conversation.mapper.js';

export class MarkReadRepository {
  async execute(ctx: RequestContext, conversationId: string): Promise<ConversationSummary | null> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const existing = await tx.conversation.findFirst({
        where: { id: conversationId, tenantId: ctx.tenantId },
        select: { id: true },
      });
      if (!existing) return null;

      const row = await tx.conversation.update({
        where: { id: conversationId },
        data: { unreadCount: 0 },
      });
      return mapConversation(row);
    });
  }
}
