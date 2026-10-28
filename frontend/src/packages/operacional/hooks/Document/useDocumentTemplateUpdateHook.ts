'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { operacionalQueryKeys } from '@/packages/operacional/helpers/OperacionalQueryKeys';
import { DocumentTemplateUpdateService } from '@/packages/operacional/services/Document/DocumentTemplateUpdateService';

export function useDocumentTemplateUpdateHook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: DocumentTemplateUpdateService,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: operacionalQueryKeys.documentTemplates });
    },
  });
}
