import { SignatureRequestCreateData } from '@/packages/operacional/data/Document/SignatureRequestCreateData';
import type { SignatureRequestCreateInput } from '@/packages/operacional/types/Document/DocumentSignatureRequestTypes';

export async function SignatureRequestCreateService(requestSchema: SignatureRequestCreateInput) {
  return SignatureRequestCreateData(requestSchema);
}
