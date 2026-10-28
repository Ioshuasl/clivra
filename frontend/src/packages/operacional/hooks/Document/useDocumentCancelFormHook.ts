'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DocumentCancelSchema,
  type DocumentCancelFormValues,
} from '@/packages/operacional/schemas/Document/DocumentIssueSchema';

export function useDocumentCancelFormHook() {
  return useForm<DocumentCancelFormValues>({
    resolver: zodResolver(DocumentCancelSchema),
    defaultValues: { reason: '' },
  });
}
