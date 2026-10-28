import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { renderDocumentContent } from '../../models/document/document_render.model.js';
import { DocumentTemplateNotFoundError } from '../../models/errors/documents.errors.js';
import { GetRepository } from '../../repositories/document_template/document_template_get.repository.js';
import type { DocumentTemplatePreviewSchema } from '../../schemas/document_template.schema.js';
import type { DocumentTemplatePreview } from '../../types/document_template/document_template.types.js';
import { BuildVariablesService } from '../document/document_variables_build.service.js';

export class PreviewService {
  constructor(
    private readonly getTemplate = new GetRepository(),
    private readonly buildVariables = new BuildVariablesService(),
  ) {}

  async execute(
    ctx: RequestContext,
    templateId: string,
    previewSchema: DocumentTemplatePreviewSchema,
  ): Promise<DocumentTemplatePreview> {
    const template = await this.getTemplate.execute(ctx, templateId);
    if (!template) throw new DocumentTemplateNotFoundError();
    const built = await this.buildVariables.execute(
      ctx,
      previewSchema.patientId,
      previewSchema.professionalId,
    );
    return {
      title: template.name,
      content: renderDocumentContent(template.content, built.variables),
    };
  }
}
