import { DocumentTemplatePreviewData } from '@/packages/operacional/data/Document/DocumentTemplatePreviewData';
import type { DocumentTemplatePreviewInput } from '@/packages/operacional/types/Document/DocumentTypes';

export async function DocumentTemplatePreviewService(inputSchema: DocumentTemplatePreviewInput) {
  return DocumentTemplatePreviewData(inputSchema);
}
