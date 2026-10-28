import { apiClient } from '@/shared/api/api-client';
import type {
  CertificateSummary,
  CertificateUploadInput,
} from '@/packages/operacional/types/Document/DocumentCertificateTypes';

export async function CertificateUpdateData(
  certificateSchema: CertificateUploadInput,
): Promise<CertificateSummary> {
  return apiClient.request<CertificateSummary>('/document-certificates/me', {
    method: 'PUT',
    body: JSON.stringify(certificateSchema),
  });
}
