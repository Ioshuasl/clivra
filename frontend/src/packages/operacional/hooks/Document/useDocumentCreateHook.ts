'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { operacionalQueryKeys } from '@/packages/operacional/helpers/OperacionalQueryKeys';
import { DocumentCreateService } from '@/packages/operacional/services/Document/DocumentCreateService';

export function useDocumentCreateHook(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: DocumentCreateService,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: operacionalQueryKeys.patientDocuments(patientId),
      });
    },
  });
}
