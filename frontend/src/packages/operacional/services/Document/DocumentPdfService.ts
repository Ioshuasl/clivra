import { DocumentPdfData } from '@/packages/operacional/data/Document/DocumentPdfData';

export async function DocumentPdfService(documentId: string) {
  return DocumentPdfData(documentId);
}
