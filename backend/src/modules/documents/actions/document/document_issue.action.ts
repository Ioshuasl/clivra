import { createHash } from 'node:crypto';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import { AuditAction, writeAuditLogSafe } from '../../../../shared/database/write_audit.js';
import { getObjectStorage, ObjectStorageError } from '../../../../shared/storage/index.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import { documentPdfStorageKey, renderDocumentPdf, type DocumentPdfInput } from '../../helpers/document_pdf.helper.js';
import { CancelRepository } from '../../repositories/document/document_cancel.repository.js';
import { CreateRepository } from '../../repositories/document/document_create.repository.js';
import { SetPdfRepository } from '../../repositories/document/document_set_pdf.repository.js';
import type { DocumentIssueRow } from '../../types/document/document.types.js';

export type IssueSupersede = { documentId: string; reason: string };

/** Emite o documento: PDF no storage, registro imutável, cancelamento do substituído e auditoria. */
export class IssueAction {
  constructor(
    private readonly uow = new UnitOfWork(),
    private readonly createDocument = new CreateRepository(),
    private readonly setPdf = new SetPdfRepository(),
    private readonly cancelDocument = new CancelRepository(),
  ) {}

  async execute(
    ctx: RequestContext,
    issue: DocumentIssueRow,
    pdfInput: DocumentPdfInput,
    supersede: IssueSupersede | null,
    extra?: { ip?: string },
  ): Promise<void> {
    const pdf = await renderDocumentPdf(pdfInput);
    const key = documentPdfStorageKey(ctx.tenantId, issue.id);
    try {
      await getObjectStorage().putObject(key, pdf, 'application/pdf');
    } catch (err) {
      if (err instanceof ObjectStorageError) {
        throw new AppError('STORAGE_UNAVAILABLE', 'Armazenamento indisponível.', 503);
      }
      throw err;
    }
    const sha256 = createHash('sha256').update(pdf).digest('hex');

    await this.uow.run(ctx, async ({ tx }) => {
      if (supersede) {
        await this.cancelDocument.executeInTx(tx, ctx, supersede.documentId, supersede.reason);
      }
      await this.createDocument.executeInTx(tx, ctx, issue);
      await this.setPdf.executeInTx(tx, ctx, issue.id, { key, sha256 });
    });

    await writeAuditLogSafe({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: AuditAction.DOCUMENT_ISSUED,
      resourceType: 'document',
      resourceId: issue.id,
      patientId: issue.patientId,
      ipAddress: extra?.ip,
      metadata: { kind: issue.kind, version: issue.version, supersedesId: issue.supersedesId },
    });
  }
}
