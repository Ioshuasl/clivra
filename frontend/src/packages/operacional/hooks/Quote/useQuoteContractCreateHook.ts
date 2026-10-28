'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QuoteContractCreateService } from '@/packages/operacional/services/Quote/QuoteContractCreateService';

export function useQuoteContractCreateHook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quoteId: string) => QuoteContractCreateService(quoteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['patient-documents'] });
    },
  });
}
