import { apiClient } from '@/shared/api/api-client';
import type {
  DocumentTemplatePreview,
  DocumentTemplatePreviewInput,
} from '@/packages/operacional/types/Document/DocumentTypes';

export async function DocumentTemplatePreviewData(
  previewSchema: DocumentTemplatePreviewInput,
): Promise<DocumentTemplatePreview> {
  return apiClient.request<DocumentTemplatePreview>(
    `/document-templates/${encodeURIComponent(previewSchema.templateId)}/preview`,
    {
      method: 'POST',
      body: JSON.stringify({
        patientId: previewSchema.patientId,
        professionalId: previewSchema.professionalId,
      }),
    },
  );
}
