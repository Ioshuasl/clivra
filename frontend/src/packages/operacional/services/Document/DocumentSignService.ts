import { DocumentSignData } from '@/packages/operacional/data/Document/DocumentSignData';
import type { DocumentSignInput } from '@/packages/operacional/types/Document/DocumentCertificateTypes';

export async function DocumentSignService(signSchema: DocumentSignInput) {
  return DocumentSignData(signSchema);
}
