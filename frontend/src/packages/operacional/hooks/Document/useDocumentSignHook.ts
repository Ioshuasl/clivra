'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { operacionalQueryKeys } from '@/packages/operacional/helpers/OperacionalQueryKeys';
import { DocumentSignService } from '@/packages/operacional/services/Document/DocumentSignService';

export function useDocumentSignHook(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: DocumentSignService,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: operacionalQueryKeys.patientDocuments(patientId),
      });
    },
  });
}
