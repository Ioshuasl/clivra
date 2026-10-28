import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { DocumentTemplateNotFoundError } from '../../models/errors/documents.errors.js';
import { DeleteRepository } from '../../repositories/document_template/document_template_delete.repository.js';

export class DeleteService {
  constructor(private readonly deleteTemplate = new DeleteRepository()) {}

  async execute(ctx: RequestContext, templateId: string): Promise<void> {
    const removed = await this.deleteTemplate.execute(ctx, templateId);
    if (!removed) throw new DocumentTemplateNotFoundError();
  }
}
