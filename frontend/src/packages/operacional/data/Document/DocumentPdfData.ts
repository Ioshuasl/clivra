import { apiClient } from '@/shared/api/api-client';
import type { DocumentPdfResult } from '@/packages/operacional/types/Document/DocumentTypes';

export async function DocumentPdfData(documentId: string): Promise<DocumentPdfResult> {
  return apiClient.request<DocumentPdfResult>(`/documents/${encodeURIComponent(documentId)}/pdf`);
}
