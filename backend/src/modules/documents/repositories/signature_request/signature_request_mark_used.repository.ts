import type { RequestContext } from '../../../../shared/domain/request_context.js';
import type { DbTransaction } from '../../../../shared/database/db_transaction.js';

export class MarkUsedRepository {
  async executeInTx(tx: DbTransaction, ctx: RequestContext, requestId: string): Promise<void> {
    await tx.documentSignatureRequest.updateMany({
      where: { id: requestId, tenantId: ctx.tenantId },
      data: { usedAt: new Date(), codeHash: null },
    });
  }
}
