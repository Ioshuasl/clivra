import { apiClient } from '@/shared/api/api-client';
import type {
  DocumentSignatureSignInput,
  PublicSignResult,
} from '@/packages/public/types/Document/DocumentSignatureTypes';

export async function DocumentSignatureSignData(
  signSchema: DocumentSignatureSignInput,
): Promise<PublicSignResult> {
  return apiClient.request<PublicSignResult>(
    `/public/document-signatures/${encodeURIComponent(signSchema.token)}/sign`,
    {
      method: 'POST',
      body: JSON.stringify({ agree: true, ...(signSchema.code ? { code: signSchema.code } : {}) }),
      skipAuth: true,
    },
  );
}
