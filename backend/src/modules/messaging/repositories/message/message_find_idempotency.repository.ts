import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { InboxMessage } from '../../types/messaging.types.js';
import { mapInboxMessage } from '../conversation/mappers/conversation.mapper.js';

export class FindByIdempotencyRepository {
  async execute(ctx: RequestContext, idempotencyKey: string): Promise<InboxMessage | null> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const row = await tx.message.findFirst({
        where: { tenantId: ctx.tenantId, idempotencyKey },
      });
      return row ? mapInboxMessage(row) : null;
    });
  }
}

export class GetMessageRepository {
  async execute(ctx: RequestContext, messageId: string): Promise<InboxMessage | null> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const row = await tx.message.findFirst({
        where: { id: messageId, tenantId: ctx.tenantId },
      });
      return row ? mapInboxMessage(row) : null;
    });
  }
}
