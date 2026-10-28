import { apiClient } from '@/shared/api/api-client';

export async function CertificateDeleteData(): Promise<void> {
  await apiClient.request<void>('/document-certificates/me', { method: 'DELETE' });
}
