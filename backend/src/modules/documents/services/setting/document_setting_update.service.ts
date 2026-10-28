import type { RequestContext } from '../../../../shared/domain/request_context.js';
import {
  DocumentTemplateNotFoundError,
  QuoteContractTemplateInvalidError,
} from '../../models/errors/documents.errors.js';
import { GetRepository as GetTemplateRepository } from '../../repositories/document_template/document_template_get.repository.js';
import { UpdateRepository } from '../../repositories/setting/document_setting_update.repository.js';
import type { DocumentSettingUpdateSchema } from '../../schemas/signature_request.schema.js';
import type { DocumentSettingSummary } from '../../types/setting/document_setting.types.js';

export class UpdateService {
  constructor(
    private readonly updateSetting = new UpdateRepository(),
    private readonly getTemplate = new GetTemplateRepository(),
  ) {}

  async execute(
    ctx: RequestContext,
    settingSchema: DocumentSettingUpdateSchema,
  ): Promise<DocumentSettingSummary> {
    if (settingSchema.quoteContractTemplateId) {
      const template = await this.getTemplate.execute(ctx, settingSchema.quoteContractTemplateId);
      if (!template) throw new DocumentTemplateNotFoundError();
      if (template.kind !== 'CONTRACT' || !template.active) {
        throw new QuoteContractTemplateInvalidError();
      }
    }
    return this.updateSetting.execute(ctx, settingSchema);
  }
}
