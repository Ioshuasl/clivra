import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { DEFAULT_DOCUMENT_TEMPLATES } from '../../helpers/document_default_templates.helper.js';
import { ListRepository } from '../../repositories/document_template/document_template_list.repository.js';
import { SeedRepository } from '../../repositories/document_template/document_template_seed.repository.js';
import type { DocumentTemplateListQuerySchema } from '../../schemas/document_template.schema.js';
import type { DocumentTemplateSummary } from '../../types/document_template/document_template.types.js';

export class ListService {
  constructor(
    private readonly seed = new SeedRepository(),
    private readonly list = new ListRepository(),
  ) {}

  async execute(
    ctx: RequestContext,
    querySchema: DocumentTemplateListQuerySchema,
  ): Promise<DocumentTemplateSummary[]> {
    await this.seed.execute(ctx, DEFAULT_DOCUMENT_TEMPLATES);
    return this.list.execute(ctx, querySchema);
  }
}
