'use client';

import { useMutation } from '@tanstack/react-query';
import { DocumentPdfService } from '@/packages/operacional/services/Document/DocumentPdfService';

export function useDocumentPdfHook() {
  return useMutation({ mutationFn: DocumentPdfService });
}
