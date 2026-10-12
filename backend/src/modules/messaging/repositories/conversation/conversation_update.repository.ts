import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { mapConversation } from '../../helpers/messaging_mapper.helper.js';
import type { ConversationSummary } from '../../types/conversation/conversation.types.js';

export class UpdateRepository {
  async execute(
    ctx: RequestContext,
    conversationId: string,
    conversationSchema: {
      assignedToUserId?: string | null;
      status?: string;
      patientId?: string | null;
    },
  ): Promise<ConversationSummary | null> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const existing = await tx.conversation.findFirst({
        where: { id: conversationId, tenantId: ctx.tenantId },
        select: { id: true },
      });
      if (!existing) return null;
      const row = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          ...(conversationSchema.assignedToUserId !== undefined
            ? { assignedTo: conversationSchema.assignedToUserId }
            : {}),
          ...(conversationSchema.status !== undefined ? { status: conversationSchema.status } : {}),
          ...(conversationSchema.patientId !== undefined ? { patientId: conversationSchema.patientId } : {}),
        },
      });
      return mapConversation(row);
    });
  }
}
