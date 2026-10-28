import { DocumentSignatureSignData } from '@/packages/public/data/Document/DocumentSignatureSignData';
import type { DocumentSignatureSignInput } from '@/packages/public/types/Document/DocumentSignatureTypes';

export async function DocumentSignatureSignService(signSchema: DocumentSignatureSignInput) {
  return DocumentSignatureSignData(signSchema);
}
