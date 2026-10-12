import type { Prisma } from '@prisma/client';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { mapConversation } from '../../helpers/messaging_mapper.helper.js';
import type { ConversationListResult } from '../../types/conversation/conversation.types.js';

export class ListRepository {
  async execute(
    ctx: RequestContext,
    input: {
      status?: string;
      q?: string;
      unread?: boolean;
      patientId?: string;
      cursor?: string;
      limit: number;
    },
  ): Promise<ConversationListResult> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const where: Prisma.ConversationWhereInput = {
        tenantId: ctx.tenantId,
        ...(input.status ? { status: input.status } : {}),
        ...(input.patientId ? { patientId: input.patientId } : {}),
        ...(input.unread ? { unreadCount: { gt: 0 } } : {}),
      };

      const search = input.q?.trim();
      if (search) {
        const digits = search.replace(/\D/g, '');
        where.OR = [
          { contactName: { contains: search, mode: 'insensitive' } },
          ...(digits.length > 0 ? [{ contactPhone: { contains: digits } }] : []),
        ];
      }

      if (input.cursor) {
        const cursorRow = await tx.conversation.findFirst({
          where: { id: input.cursor, tenantId: ctx.tenantId },
          select: { id: true, lastMessageAt: true },
        });
        if (cursorRow?.lastMessageAt) {
          where.AND = [
            {
              OR: [
                { lastMessageAt: { lt: cursorRow.lastMessageAt } },
                { lastMessageAt: cursorRow.lastMessageAt, id: { lt: cursorRow.id } },
              ],
            },
          ];
        } else if (cursorRow) {
          where.id = { lt: cursorRow.id };
        }
      }

      const rows = await tx.conversation.findMany({
        where,
        orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
        take: input.limit + 1,
      });
      const page = rows.slice(0, input.limit);
      return {
        items: page.map(mapConversation),
        nextCursor: rows.length > input.limit ? (page[page.length - 1]?.id ?? null) : null,
      };
    });
  }
}
