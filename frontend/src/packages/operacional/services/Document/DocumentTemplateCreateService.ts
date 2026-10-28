import { DocumentTemplateCreateData } from '@/packages/operacional/data/Document/DocumentTemplateCreateData';
import type { DocumentTemplateSaveInput } from '@/packages/operacional/types/Document/DocumentTypes';

export async function DocumentTemplateCreateService(inputSchema: DocumentTemplateSaveInput) {
  return DocumentTemplateCreateData(inputSchema);
}
