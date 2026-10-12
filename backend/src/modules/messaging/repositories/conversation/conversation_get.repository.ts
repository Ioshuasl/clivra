import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { mapConversation } from '../../helpers/messaging_mapper.helper.js';
import type { ConversationSummary } from '../../types/conversation/conversation.types.js';

export class GetRepository {
  async execute(ctx: RequestContext, conversationId: string): Promise<ConversationSummary | null> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const row = await tx.conversation.findFirst({
        where: { id: conversationId, tenantId: ctx.tenantId },
      });
      return row ? mapConversation(row) : null;
    });
  }
}
