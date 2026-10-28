import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { DocumentTemplateNotFoundError } from '../../models/errors/documents.errors.js';
import { GetRepository } from '../../repositories/document_template/document_template_get.repository.js';
import type { DocumentTemplateSummary } from '../../types/document_template/document_template.types.js';

export class GetService {
  constructor(private readonly getTemplate = new GetRepository()) {}

  async execute(ctx: RequestContext, templateId: string): Promise<DocumentTemplateSummary> {
    const template = await this.getTemplate.execute(ctx, templateId);
    if (!template) throw new DocumentTemplateNotFoundError();
    return template;
  }
}
