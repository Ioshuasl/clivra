import { DocumentGetData } from '@/packages/operacional/data/Document/DocumentGetData';

export async function DocumentGetService(documentId: string) {
  return DocumentGetData(documentId);
}
