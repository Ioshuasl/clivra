import type { RequestContext } from '../../shared/domain/request_context.js';
import { IssueService } from './services/quote_contract/quote_contract_issue.service.js';
import type {
  QuoteContractData,
  QuoteContractMode,
  QuoteContractResult,
} from './types/quote_contract/quote_contract.types.js';

const issueQuoteContractService = new IssueService();

/**
 * Contrato do orçamento aprovado. O módulo de orçamentos entrega os dados já montados;
 * `documents` não conhece o módulo de orçamentos.
 */
export async function issueQuoteContract(
  ctx: RequestContext,
  quote: QuoteContractData,
  mode: QuoteContractMode,
): Promise<QuoteContractResult | null> {
  return issueQuoteContractService.execute(ctx, quote, mode);
}

export type {
  QuoteContractData,
  QuoteContractMode,
  QuoteContractResult,
} from './types/quote_contract/quote_contract.types.js';
