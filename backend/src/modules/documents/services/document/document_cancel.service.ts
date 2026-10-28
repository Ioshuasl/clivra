import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { CancelAction } from '../../actions/document/document_cancel.action.js';
import { canAccessKind } from '../../models/document/document_access.model.js';
import { DocumentForbiddenKindError } from '../../models/errors/documents.errors.js';
import type { DocumentCancelSchema } from '../../schemas/document.schema.js';
import type { DocumentDetail } from '../../types/document/document.types.js';
import { GetService } from './document_get.service.js';

export class CancelService {
  constructor(
    private readonly getDocument = new GetService(),
    private readonly cancelAction = new CancelAction(),
  ) {}

  async execute(
    ctx: RequestContext,
    documentId: string,
    documentSchema: DocumentCancelSchema,
    extra?: { ip?: string },
  ): Promise<DocumentDetail> {
    const document = await this.getDocument.execute(ctx, documentId);
    if (!canAccessKind(ctx.permissions, document.kind, 'write')) throw new DocumentForbiddenKindError();
    await this.cancelAction.execute(ctx, document, documentSchema.reason, extra);
    return this.getDocument.execute(ctx, documentId);
  }
}
