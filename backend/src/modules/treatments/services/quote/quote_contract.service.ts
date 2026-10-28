import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { issueQuoteContract, type QuoteContractResult } from '../../../documents/documents_public.js';
import { buildQuoteContractData } from '../../helpers/quote_contract_data.helper.js';
import { QuoteNotApprovedError, QuoteNotFoundError } from '../../models/errors/treatments.errors.js';
import { GetRepository } from '../../repositories/quote/quote_get.repository.js';

/** Botão "Gerar contrato": cria (ou devolve) o contrato do orçamento já aprovado. */
export class ContractService {
  constructor(private readonly get = new GetRepository()) {}

  async execute(ctx: RequestContext, quoteId: string): Promise<QuoteContractResult> {
    const quote = await this.get.execute(ctx, quoteId);
    if (!quote) throw new QuoteNotFoundError();
    const contractData = buildQuoteContractData(quote);
    if (!contractData) throw new QuoteNotApprovedError();
    const result = await issueQuoteContract(ctx, contractData, 'MANUAL');
    if (!result) throw new QuoteNotApprovedError();
    return result;
  }
}
