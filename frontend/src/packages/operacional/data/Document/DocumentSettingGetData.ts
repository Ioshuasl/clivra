import { apiClient } from '@/shared/api/api-client';
import type { DocumentSettingSummary } from '@/packages/operacional/types/Document/DocumentSignatureRequestTypes';

export async function DocumentSettingGetData(): Promise<DocumentSettingSummary> {
  return apiClient.request<DocumentSettingSummary>('/document-settings');
}
