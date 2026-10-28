import { apiClient } from '@/shared/api/api-client';
import type { PublicSignatureView } from '@/packages/public/types/Document/DocumentSignatureTypes';

export async function DocumentSignatureGetData(token: string): Promise<PublicSignatureView> {
  return apiClient.request<PublicSignatureView>(
    `/public/document-signatures/${encodeURIComponent(token)}`,
    { skipAuth: true },
  );
}
