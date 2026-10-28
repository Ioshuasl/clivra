'use client';

import { useMutation } from '@tanstack/react-query';
import { DocumentSignatureCodeService } from '@/packages/public/services/Document/DocumentSignatureCodeService';

export function useDocumentSignatureCodeHook() {
  return useMutation({
    // A própria tela mostra o erro junto ao formulário.
    meta: { silent: true },
    mutationFn: DocumentSignatureCodeService,
  });
}
