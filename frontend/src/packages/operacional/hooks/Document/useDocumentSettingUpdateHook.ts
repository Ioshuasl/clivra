'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { operacionalQueryKeys } from '@/packages/operacional/helpers/OperacionalQueryKeys';
import { DocumentSettingUpdateService } from '@/packages/operacional/services/Document/DocumentSettingUpdateService';

export function useDocumentSettingUpdateHook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: DocumentSettingUpdateService,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: operacionalQueryKeys.documentSetting });
    },
  });
}
