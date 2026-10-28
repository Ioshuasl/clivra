'use client';

import { useQuery } from '@tanstack/react-query';
import { operacionalQueryKeys } from '@/packages/operacional/helpers/OperacionalQueryKeys';
import { DocumentListService } from '@/packages/operacional/services/Document/DocumentListService';

export function useDocumentListHook(patientId: string) {
  return useQuery({
    queryKey: operacionalQueryKeys.patientDocuments(patientId),
    queryFn: () => DocumentListService(patientId),
  });
}
