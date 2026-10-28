'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DocumentSignSchema,
  type DocumentSignFormValues,
} from '@/packages/operacional/schemas/Document/DocumentCertificateSchema';

export function useDocumentSignFormHook() {
  return useForm<DocumentSignFormValues>({
    resolver: zodResolver(DocumentSignSchema),
    defaultValues: { password: '' },
  });
}
