import { DocumentTemplateDeleteData } from '@/packages/operacional/data/Document/DocumentTemplateDeleteData';

export async function DocumentTemplateDeleteService(templateId: string) {
  return DocumentTemplateDeleteData(templateId);
}
