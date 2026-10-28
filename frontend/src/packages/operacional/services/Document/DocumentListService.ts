import { DocumentListData } from '@/packages/operacional/data/Document/DocumentListData';

export async function DocumentListService(patientId: string) {
  return DocumentListData(patientId);
}
