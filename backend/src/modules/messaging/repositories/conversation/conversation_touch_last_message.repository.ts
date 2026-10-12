import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';

export class TouchLastMessageRepository {
  async execute(
    ctx: RequestContext,
    conversationId: string,
    patch?: { patientId?: string | null },
  ): Promise<void> {
    const tenantPrisma = getTenantPrisma();
    await tenantPrisma.runInTenantContext(ctx, async (tx) => {
      await tx.conversation.updateMany({
        where: { id: conversationId, tenantId: ctx.tenantId },
        data: {
          lastMessageAt: new Date(),
          ...(patch?.patientId !== undefined ? { patientId: patch.patientId } : {}),
        },
      });
    });
  }
}
