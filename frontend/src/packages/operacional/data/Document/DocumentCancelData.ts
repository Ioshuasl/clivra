import { apiClient } from '@/shared/api/api-client';
import type {
  DocumentCancelInput,
  DocumentDetail,
} from '@/packages/operacional/types/Document/DocumentTypes';

export async function DocumentCancelData(documentSchema: DocumentCancelInput): Promise<DocumentDetail> {
  return apiClient.request<DocumentDetail>(
    `/documents/${encodeURIComponent(documentSchema.documentId)}/cancel`,
    { method: 'POST', body: JSON.stringify({ reason: documentSchema.reason }) },
  );
}
