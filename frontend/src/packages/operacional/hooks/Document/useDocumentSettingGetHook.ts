'use client';

import { useQuery } from '@tanstack/react-query';
import { operacionalQueryKeys } from '@/packages/operacional/helpers/OperacionalQueryKeys';
import { DocumentSettingGetService } from '@/packages/operacional/services/Document/DocumentSettingGetService';

export function useDocumentSettingGetHook() {
  return useQuery({
    queryKey: operacionalQueryKeys.documentSetting,
    queryFn: DocumentSettingGetService,
  });
}
