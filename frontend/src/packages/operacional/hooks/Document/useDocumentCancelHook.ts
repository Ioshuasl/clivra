'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { operacionalQueryKeys } from '@/packages/operacional/helpers/OperacionalQueryKeys';
import { DocumentCancelService } from '@/packages/operacional/services/Document/DocumentCancelService';

export function useDocumentCancelHook(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: DocumentCancelService,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: operacionalQueryKeys.patientDocuments(patientId),
      });
    },
  });
}
