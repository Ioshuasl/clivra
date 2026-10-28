import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { GetRepository } from '../../repositories/setting/document_setting_get.repository.js';
import type { DocumentSettingSummary } from '../../types/setting/document_setting.types.js';

export class GetService {
  constructor(private readonly getSetting = new GetRepository()) {}

  async execute(ctx: RequestContext): Promise<DocumentSettingSummary> {
    return this.getSetting.execute(ctx);
  }
}
