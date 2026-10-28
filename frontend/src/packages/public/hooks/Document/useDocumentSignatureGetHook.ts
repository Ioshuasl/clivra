'use client';

import { useQuery } from '@tanstack/react-query';
import { publicQueryKeys } from '@/packages/public/helpers/PublicQueryKeys';
import { DocumentSignatureGetService } from '@/packages/public/services/Document/DocumentSignatureGetService';

export function useDocumentSignatureGetHook(token: string) {
  return useQuery({
    queryKey: publicQueryKeys.documentSignature(token),
    queryFn: () => DocumentSignatureGetService(token),
    enabled: Boolean(token),
    retry: false,
  });
}
