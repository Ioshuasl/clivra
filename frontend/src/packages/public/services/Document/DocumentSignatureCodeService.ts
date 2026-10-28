import { DocumentSignatureCodeData } from '@/packages/public/data/Document/DocumentSignatureCodeData';

export async function DocumentSignatureCodeService(token: string) {
  return DocumentSignatureCodeData(token);
}
