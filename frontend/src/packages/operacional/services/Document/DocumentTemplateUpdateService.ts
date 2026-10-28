import { DocumentTemplateUpdateData } from '@/packages/operacional/data/Document/DocumentTemplateUpdateData';
import type { DocumentTemplateUpdateInput } from '@/packages/operacional/types/Document/DocumentTypes';

export async function DocumentTemplateUpdateService(inputSchema: DocumentTemplateUpdateInput) {
  return DocumentTemplateUpdateData(inputSchema);
}
