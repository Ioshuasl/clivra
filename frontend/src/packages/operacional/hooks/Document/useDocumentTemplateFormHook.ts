'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DocumentTemplateSchema,
  type DocumentTemplateFormValues,
} from '@/packages/operacional/schemas/Document/DocumentTemplateSchema';

export function useDocumentTemplateFormHook(defaultValues: DocumentTemplateFormValues) {
  return useForm<DocumentTemplateFormValues>({
    resolver: zodResolver(DocumentTemplateSchema),
    defaultValues,
  });
}
