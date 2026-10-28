'use client';

import { useMutation } from '@tanstack/react-query';
import { DocumentSignatureSignService } from '@/packages/public/services/Document/DocumentSignatureSignService';

export function useDocumentSignatureSignHook() {
  return useMutation({
    meta: { silent: true },
    mutationFn: DocumentSignatureSignService,
  });
}
