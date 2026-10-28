import { apiClient } from '@/shared/api/api-client';
import type {
  DocumentTemplateSummary,
  DocumentTemplateUpdateInput,
} from '@/packages/operacional/types/Document/DocumentTypes';

export async function DocumentTemplateUpdateData(
  templateSchema: DocumentTemplateUpdateInput,
): Promise<DocumentTemplateSummary> {
  return apiClient.request<DocumentTemplateSummary>(
    `/document-templates/${encodeURIComponent(templateSchema.templateId)}`,
    { method: 'PATCH', body: JSON.stringify(templateSchema.template) },
  );
}
