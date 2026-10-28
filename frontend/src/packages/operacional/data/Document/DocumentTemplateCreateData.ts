import { apiClient } from '@/shared/api/api-client';
import type {
  DocumentTemplateSaveInput,
  DocumentTemplateSummary,
} from '@/packages/operacional/types/Document/DocumentTypes';

export async function DocumentTemplateCreateData(
  templateSchema: DocumentTemplateSaveInput,
): Promise<DocumentTemplateSummary> {
  return apiClient.request<DocumentTemplateSummary>('/document-templates', {
    method: 'POST',
    body: JSON.stringify(templateSchema),
  });
}
