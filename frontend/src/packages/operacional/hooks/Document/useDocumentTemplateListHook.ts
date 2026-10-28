'use client';

import { useQuery } from '@tanstack/react-query';
import { operacionalQueryKeys } from '@/packages/operacional/helpers/OperacionalQueryKeys';
import { DocumentTemplateListService } from '@/packages/operacional/services/Document/DocumentTemplateListService';

export function useDocumentTemplateListHook() {
  return useQuery({
    queryKey: operacionalQueryKeys.documentTemplates,
    queryFn: DocumentTemplateListService,
  });
}
