import { apiClient } from '@/shared/api/api-client';

export async function DocumentTemplateDeleteData(templateId: string): Promise<void> {
  await apiClient.request<void>(`/document-templates/${encodeURIComponent(templateId)}`, {
    method: 'DELETE',
  });
}
