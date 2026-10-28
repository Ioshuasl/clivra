import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { findUnknownVariables } from '../../models/document/document_render.model.js';
import { DocumentUnknownVariableError } from '../../models/errors/documents.errors.js';
import { CreateRepository } from '../../repositories/document_template/document_template_create.repository.js';
import type { DocumentTemplateCreateSchema } from '../../schemas/document_template.schema.js';
import type { DocumentTemplateSummary } from '../../types/document_template/document_template.types.js';

export class CreateService {
  constructor(private readonly createTemplate = new CreateRepository()) {}

  async execute(
    ctx: RequestContext,
    templateSchema: DocumentTemplateCreateSchema,
  ): Promise<DocumentTemplateSummary> {
    const unknown = findUnknownVariables(templateSchema.content);
    if (unknown.length > 0) throw new DocumentUnknownVariableError(unknown);
    return this.createTemplate.execute(ctx, templateSchema);
  }
}
