import { apiClient } from '@/shared/api/api-client';
import type { DocumentSummary } from '@/packages/operacional/types/Document/DocumentTypes';

export async function DocumentListData(patientId: string): Promise<DocumentSummary[]> {
  return apiClient.request<DocumentSummary[]>(
    `/patients/${encodeURIComponent(patientId)}/documents`,
  );
}
