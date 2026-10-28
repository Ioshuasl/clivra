'use client';

import { useQuery } from '@tanstack/react-query';
import { DocumentGetService } from '@/packages/operacional/services/Document/DocumentGetService';

export function useDocumentGetHook(documentId: string | undefined) {
  return useQuery({
    queryKey: ['document', documentId ?? ''] as const,
    queryFn: () => DocumentGetService(documentId as string),
    enabled: Boolean(documentId),
  });
}
