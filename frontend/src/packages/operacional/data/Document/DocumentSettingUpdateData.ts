import { apiClient } from '@/shared/api/api-client';
import type {
  DocumentSettingSummary,
  DocumentSettingUpdateInput,
} from '@/packages/operacional/types/Document/DocumentSignatureRequestTypes';

export async function DocumentSettingUpdateData(
  settingSchema: DocumentSettingUpdateInput,
): Promise<DocumentSettingSummary> {
  return apiClient.request<DocumentSettingSummary>('/document-settings', {
    method: 'PUT',
    body: JSON.stringify(settingSchema),
  });
}
