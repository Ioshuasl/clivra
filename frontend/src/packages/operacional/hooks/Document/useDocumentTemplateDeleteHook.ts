'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { operacionalQueryKeys } from '@/packages/operacional/helpers/OperacionalQueryKeys';
import { DocumentTemplateDeleteService } from '@/packages/operacional/services/Document/DocumentTemplateDeleteService';

export function useDocumentTemplateDeleteHook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: DocumentTemplateDeleteService,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: operacionalQueryKeys.documentTemplates });
    },
  });
}
