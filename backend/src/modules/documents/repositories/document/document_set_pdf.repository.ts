import type { RequestContext } from '../../../../shared/domain/request_context.js';
import type { DbTransaction } from '../../../../shared/database/db_transaction.js';

export class SetPdfRepository {
  async executeInTx(
    tx: DbTransaction,
    ctx: RequestContext,
    documentId: string,
    pdf: { key: string; sha256: string },
  ): Promise<void> {
    await tx.document.updateMany({
      where: { id: documentId, tenantId: ctx.tenantId },
      data: { pdfKey: pdf.key, pdfSha256: pdf.sha256 },
    });
  }
}
