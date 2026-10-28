import type { RequestContext } from '../../../../shared/domain/request_context.js';
import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import type { DocumentStatus } from '../../enum/document/document_status.enum.js';

export class SetStatusRepository {
  async executeInTx(
    tx: DbTransaction,
    ctx: RequestContext,
    documentId: string,
    status: DocumentStatus,
  ): Promise<void> {
    await tx.document.updateMany({
      where: { id: documentId, tenantId: ctx.tenantId },
      data: { status },
    });
  }
}
