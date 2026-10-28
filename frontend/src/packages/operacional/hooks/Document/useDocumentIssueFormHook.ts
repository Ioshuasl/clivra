'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DocumentIssueSchema,
  type DocumentIssueFormValues,
} from '@/packages/operacional/schemas/Document/DocumentIssueSchema';

export function useDocumentIssueFormHook(defaultValues: DocumentIssueFormValues) {
  return useForm<DocumentIssueFormValues>({
    resolver: zodResolver(DocumentIssueSchema),
    defaultValues,
  });
}
