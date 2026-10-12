import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { ConversationList } from '../../types/messaging.types.js';
import { mapConversation } from './mappers/conversation.mapper.js';

export class ListRepository {
  async execute(
    ctx: RequestContext,
    query: {
      status?: string;
      patientId?: string;
      q?: string;
      unread?: boolean;
      cursor?: string;
      limit: number;
    },
  ): Promise<ConversationList> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const cursorRow = query.cursor
        ? await tx.conversation.findFirst({
            where: { id: query.cursor, tenantId: ctx.tenantId },
            select: { id: true, lastMessageAt: true },
          })
        : null;

      const q = query.q?.trim();
      const rows = await tx.conversation.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(query.status ? { status: query.status } : {}),
          ...(query.patientId ? { patientId: query.patientId } : {}),
          ...(query.unread === true ? { unreadCount: { gt: 0 } } : {}),
          ...(query.unread === false ? { unreadCount: 0 } : {}),
          ...(q
            ? {
                OR: [
                  { contactPhone: { contains: q } },
                  { contactName: { contains: q, mode: 'insensitive' } },
                  { patient: { name: { contains: q, mode: 'insensitive' } } },
                ],
              }
            : {}),
          ...(cursorRow
            ? {
                OR: [
                  { lastMessageAt: { lt: cursorRow.lastMessageAt ?? new Date(0) } },
                  {
                    lastMessageAt: cursorRow.lastMessageAt,
                    id: { lt: cursorRow.id },
                  },
                ],
              }
            : {}),
        },
        orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
      });

      const page = rows.slice(0, query.limit);
      const nextCursor = rows.length > query.limit ? (page[page.length - 1]?.id ?? null) : null;
      return { items: page.map(mapConversation), nextCursor };
    });
  }
}
