'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { operacionalQueryKeys } from '@/packages/operacional/helpers/OperacionalQueryKeys';
import { DocumentTemplateCreateService } from '@/packages/operacional/services/Document/DocumentTemplateCreateService';

export function useDocumentTemplateCreateHook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: DocumentTemplateCreateService,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: operacionalQueryKeys.documentTemplates });
    },
  });
}
