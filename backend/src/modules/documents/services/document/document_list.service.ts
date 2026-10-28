import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { accessibleKinds } from '../../models/document/document_access.model.js';
import { ListRepository } from '../../repositories/document/document_list.repository.js';
import type { DocumentSummary } from '../../types/document/document.types.js';

export class ListService {
  constructor(private readonly listDocuments = new ListRepository()) {}

  async execute(ctx: RequestContext, patientId: string): Promise<DocumentSummary[]> {
    return this.listDocuments.execute(ctx, patientId, accessibleKinds(ctx.permissions, 'read'));
  }
}
