import { apiClient } from '@/shared/api/api-client';
import type { CertificateMe } from '@/packages/operacional/types/Document/DocumentCertificateTypes';

export async function CertificateGetData(): Promise<CertificateMe> {
  return apiClient.request<CertificateMe>('/document-certificates/me');
}
