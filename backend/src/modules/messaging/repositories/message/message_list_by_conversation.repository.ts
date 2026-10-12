import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { InboxMessageList } from '../../types/messaging.types.js';
import { mapInboxMessage } from '../conversation/mappers/conversation.mapper.js';

export class ListByConversationRepository {
  async execute(
    ctx: RequestContext,
    conversationId: string,
    query: { cursor?: string; limit: number },
  ): Promise<InboxMessageList> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const conversation = await tx.conversation.findFirst({
        where: { id: conversationId, tenantId: ctx.tenantId },
        select: { id: true },
      });
      if (!conversation) {
        return { items: [], nextCursor: null };
      }

      const cursorRow = query.cursor
        ? await tx.message.findFirst({
            where: { id: query.cursor, tenantId: ctx.tenantId, conversationId },
            select: { id: true, createdAt: true },
          })
        : null;

      const rows = await tx.message.findMany({
        where: {
          tenantId: ctx.tenantId,
          conversationId,
          ...(cursorRow
            ? {
                OR: [
                  { createdAt: { lt: cursorRow.createdAt } },
                  { createdAt: cursorRow.createdAt, id: { lt: cursorRow.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
      });

      const page = rows.slice(0, query.limit);
      const nextCursor = rows.length > query.limit ? (page[page.length - 1]?.id ?? null) : null;
      return {
        items: page.reverse().map(mapInboxMessage),
        nextCursor,
      };
    });
  }
}
