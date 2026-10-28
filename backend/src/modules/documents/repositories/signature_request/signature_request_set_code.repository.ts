import type { RequestContext } from '../../../../shared/domain/request_context.js';
import type { DbTransaction } from '../../../../shared/database/db_transaction.js';

export class SetCodeRepository {
  async executeInTx(
    tx: DbTransaction,
    ctx: RequestContext,
    requestId: string,
    code: { hash: string; expiresAt: Date; sentVia: 'WHATSAPP' | 'EMAIL' },
  ): Promise<void> {
    await tx.documentSignatureRequest.updateMany({
      where: { id: requestId, tenantId: ctx.tenantId },
      data: {
        codeHash: code.hash,
        codeExpiresAt: code.expiresAt,
        codeAttempts: 0,
        codeSentVia: code.sentVia,
      },
    });
  }
}
