import { CertificateUpdateData } from '@/packages/operacional/data/Document/CertificateUpdateData';
import type { CertificateUploadInput } from '@/packages/operacional/types/Document/DocumentCertificateTypes';

export async function CertificateUpdateService(certificateSchema: CertificateUploadInput) {
  return CertificateUpdateData(certificateSchema);
}
