import type { RequestContext } from '../../../../shared/domain/request_context.js';
import type { DbTransaction } from '../../../../shared/database/db_transaction.js';

export class CancelRepository {
  async executeInTx(
    tx: DbTransaction,
    ctx: RequestContext,
    documentId: string,
    reason: string,
  ): Promise<boolean> {
    const result = await tx.document.updateMany({
      where: { id: documentId, tenantId: ctx.tenantId, status: { not: 'CANCELLED' } },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: ctx.userId,
        cancelReason: reason,
      },
    });
    return result.count > 0;
  }
}
