import { apiClient } from '@/shared/api/api-client';
import type { DocumentTemplateSummary } from '@/packages/operacional/types/Document/DocumentTypes';

export async function DocumentTemplateListData(): Promise<DocumentTemplateSummary[]> {
  return apiClient.request<DocumentTemplateSummary[]>('/document-templates');
}
