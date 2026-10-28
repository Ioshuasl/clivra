'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DocumentSignatureSchema,
  type DocumentSignatureFormValues,
} from '@/packages/public/schemas/Document/DocumentSignatureSchema';

export function useDocumentSignatureFormHook() {
  return useForm<DocumentSignatureFormValues>({
    resolver: zodResolver(DocumentSignatureSchema),
    defaultValues: { agree: false, code: '' },
  });
}
