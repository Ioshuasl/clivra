import { apiClient } from '@/shared/api/api-client';
import type { QuoteContractResult } from '@/packages/operacional/types/Quote/QuoteTypes';

export async function QuoteContractCreateData(quoteId: string): Promise<QuoteContractResult> {
  return apiClient.request<QuoteContractResult>(`/quotes/${encodeURIComponent(quoteId)}/contract`, {
    method: 'POST',
  });
}
