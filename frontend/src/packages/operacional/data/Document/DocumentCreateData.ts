import { apiClient } from '@/shared/api/api-client';
import type {
  DocumentDetail,
  DocumentIssueInput,
} from '@/packages/operacional/types/Document/DocumentTypes';

export async function DocumentCreateData(documentSchema: DocumentIssueInput): Promise<DocumentDetail> {
  const { patientId, ...body } = documentSchema;
  return apiClient.request<DocumentDetail>(`/patients/${encodeURIComponent(patientId)}/documents`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
