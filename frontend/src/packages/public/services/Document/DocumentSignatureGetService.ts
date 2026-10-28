import { DocumentSignatureGetData } from '@/packages/public/data/Document/DocumentSignatureGetData';

export async function DocumentSignatureGetService(token: string) {
  return DocumentSignatureGetData(token);
}
