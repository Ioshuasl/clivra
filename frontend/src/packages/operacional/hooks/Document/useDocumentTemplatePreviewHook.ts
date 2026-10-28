'use client';

import { useMutation } from '@tanstack/react-query';
import { DocumentTemplatePreviewService } from '@/packages/operacional/services/Document/DocumentTemplatePreviewService';

export function useDocumentTemplatePreviewHook() {
  return useMutation({ mutationFn: DocumentTemplatePreviewService });
}
