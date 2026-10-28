import { apiClient } from '@/shared/api/api-client';
import type { DocumentSignInput } from '@/packages/operacional/types/Document/DocumentCertificateTypes';
import type { DocumentDetail } from '@/packages/operacional/types/Document/DocumentTypes';

export async function DocumentSignData(signSchema: DocumentSignInput): Promise<DocumentDetail> {
  return apiClient.request<DocumentDetail>(
    `/documents/${encodeURIComponent(signSchema.documentId)}/sign`,
    { method: 'POST', body: JSON.stringify({ password: signSchema.password }) },
  );
}
