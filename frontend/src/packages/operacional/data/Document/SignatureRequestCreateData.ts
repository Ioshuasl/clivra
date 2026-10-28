import { apiClient } from '@/shared/api/api-client';
import type {
  SignatureRequestCreateInput,
  SignatureRequestCreateResult,
} from '@/packages/operacional/types/Document/DocumentSignatureRequestTypes';

export async function SignatureRequestCreateData(
  requestSchema: SignatureRequestCreateInput,
): Promise<SignatureRequestCreateResult> {
  return apiClient.request<SignatureRequestCreateResult>(
    `/documents/${encodeURIComponent(requestSchema.documentId)}/signature-requests`,
    { method: 'POST', body: JSON.stringify({ channel: requestSchema.channel }) },
  );
}
