import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { QuoteContractTemplateMissingError } from '../../models/errors/documents.errors.js';
import { GetByQuoteRepository } from '../../repositories/document/document_get_by_quote.repository.js';
import { GetRepository as GetTemplateRepository } from '../../repositories/document_template/document_template_get.repository.js';
import type {
  QuoteContractData,
  QuoteContractMode,
  QuoteContractResult,
} from '../../types/quote_contract/quote_contract.types.js';
import { CreateService } from '../document/document_create.service.js';
import { GetService as GetSettingService } from '../setting/document_setting_get.service.js';

/**
 * Emite o contrato de um orçamento aprovado com o modelo escolhido pela clínica.
 * AUTO só age se a clínica ligou a geração automática; MANUAL exige modelo escolhido.
 */
export class IssueService {
  constructor(
    private readonly getSetting = new GetSettingService(),
    private readonly getByQuote = new GetByQuoteRepository(),
    private readonly getTemplate = new GetTemplateRepository(),
    private readonly createDocument = new CreateService(),
  ) {}

  async execute(
    ctx: RequestContext,
    quote: QuoteContractData,
    mode: QuoteContractMode,
  ): Promise<QuoteContractResult | null> {
    const setting = await this.getSetting.execute(ctx);
    if (mode === 'AUTO' && !setting.quoteContractAuto) return null;
    if (!setting.quoteContractTemplateId) {
      if (mode === 'AUTO') return null;
      throw new QuoteContractTemplateMissingError();
    }

    const existing = await this.getByQuote.execute(ctx, quote.quoteId);
    if (existing) return { documentId: existing, created: false };

    const template = await this.getTemplate.execute(ctx, setting.quoteContractTemplateId);
    if (!template || !template.active || template.kind !== 'CONTRACT') {
      if (mode === 'AUTO') return null;
      throw new QuoteContractTemplateMissingError();
    }

    const document = await this.createDocument.execute(
      ctx,
      quote.patientId,
      { templateId: template.id, professionalId: quote.professionalId },
      undefined,
      { quote, system: true },
    );
    return { documentId: document.id, created: true };
  }
}
