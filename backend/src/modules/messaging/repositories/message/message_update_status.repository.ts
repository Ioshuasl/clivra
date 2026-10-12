import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';

export class UpdateStatusRepository {
  async execute(
    ctx: RequestContext,
    messageId: string,
    patch: {
      status: string;
      providerMessageId?: string | null;
      errorCode?: string | null;
      errorMessage?: string | null;
    },
  ): Promise<void> {
    const tenantPrisma = getTenantPrisma();
    await tenantPrisma.runInTenantContext(ctx, async (tx) => {
      await tx.message.updateMany({
        where: { id: messageId, tenantId: ctx.tenantId },
        data: {
          status: patch.status,
          ...(patch.providerMessageId !== undefined
            ? { providerMessageId: patch.providerMessageId }
            : {}),
          ...(patch.errorCode !== undefined ? { errorCode: patch.errorCode } : {}),
          ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
        },
      });
    });
  }
}
