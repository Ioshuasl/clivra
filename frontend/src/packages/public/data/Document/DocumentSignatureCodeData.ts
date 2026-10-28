import { apiClient } from '@/shared/api/api-client';
import type { PublicSendCodeResult } from '@/packages/public/types/Document/DocumentSignatureTypes';

export async function DocumentSignatureCodeData(token: string): Promise<PublicSendCodeResult> {
  return apiClient.request<PublicSendCodeResult>(
    `/public/document-signatures/${encodeURIComponent(token)}/code`,
    { method: 'POST', body: '{}', skipAuth: true },
  );
}
