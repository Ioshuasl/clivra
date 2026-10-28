import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { findUnknownVariables } from '../../models/document/document_render.model.js';
import {
  DocumentTemplateNotFoundError,
  DocumentUnknownVariableError,
} from '../../models/errors/documents.errors.js';
import { UpdateRepository } from '../../repositories/document_template/document_template_update.repository.js';
import type { DocumentTemplateUpdateSchema } from '../../schemas/document_template.schema.js';
import type { DocumentTemplateSummary } from '../../types/document_template/document_template.types.js';

export class UpdateService {
  constructor(private readonly updateTemplate = new UpdateRepository()) {}

  async execute(
    ctx: RequestContext,
    templateId: string,
    templateSchema: DocumentTemplateUpdateSchema,
  ): Promise<DocumentTemplateSummary> {
    if (templateSchema.content) {
      const unknown = findUnknownVariables(templateSchema.content);
      if (unknown.length > 0) throw new DocumentUnknownVariableError(unknown);
    }
    const template = await this.updateTemplate.execute(ctx, templateId, templateSchema);
    if (!template) throw new DocumentTemplateNotFoundError();
    return template;
  }
}
