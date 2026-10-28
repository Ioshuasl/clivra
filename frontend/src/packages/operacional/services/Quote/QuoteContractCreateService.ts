import { QuoteContractCreateData } from '@/packages/operacional/data/Quote/QuoteContractCreateData';

export async function QuoteContractCreateService(quoteId: string) {
  return QuoteContractCreateData(quoteId);
}
