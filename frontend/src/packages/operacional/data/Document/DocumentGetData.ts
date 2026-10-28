import { apiClient } from '@/shared/api/api-client';
import type { DocumentDetail } from '@/packages/operacional/types/Document/DocumentTypes';

export async function DocumentGetData(documentId: string): Promise<DocumentDetail> {
  return apiClient.request<DocumentDetail>(`/documents/${encodeURIComponent(documentId)}`);
}
