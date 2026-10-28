import type { RequestContext } from '../../../../shared/domain/request_context.js';
import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import type { DocumentStatus } from '../../enum/document/document_status.enum.js';

/** Depois da assinatura: o PDF oficial passa a ser o assinado e o status avança. */
export class SetSignedRepository {
  async executeInTx(
    tx: DbTransaction,
    ctx: RequestContext,
    documentId: string,
    signed: { pdfKey: string; pdfSha256: string; status: DocumentStatus },
  ): Promise<void> {
    await tx.document.updateMany({
      where: { id: documentId, tenantId: ctx.tenantId },
      data: { pdfKey: signed.pdfKey, pdfSha256: signed.pdfSha256, status: signed.status },
    });
  }
}
