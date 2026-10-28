import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { canAccessKind } from '../../models/document/document_access.model.js';
import { DocumentForbiddenKindError, DocumentNotFoundError } from '../../models/errors/documents.errors.js';
import { GetRepository } from '../../repositories/document/document_get.repository.js';
import type { DocumentDetail, DocumentRecord } from '../../types/document/document.types.js';

export class GetService {
  constructor(private readonly getDocument = new GetRepository()) {}

  /** Uso interno: devolve também a chave do PDF. */
  async executeRecord(ctx: RequestContext, documentId: string): Promise<DocumentRecord> {
    const document = await this.getDocument.execute(ctx, documentId);
    if (!document) throw new DocumentNotFoundError();
    if (!canAccessKind(ctx.permissions, document.kind, 'read')) throw new DocumentForbiddenKindError();
    return document;
  }

  async execute(ctx: RequestContext, documentId: string): Promise<DocumentDetail> {
    const { pdfKey: _pdfKey, ...detail } = await this.executeRecord(ctx, documentId);
    return detail;
  }
}
