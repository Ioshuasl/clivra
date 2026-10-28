'use client';

import { useQuery } from '@tanstack/react-query';
import { operacionalQueryKeys } from '@/packages/operacional/helpers/OperacionalQueryKeys';
import { CertificateGetService } from '@/packages/operacional/services/Document/CertificateGetService';

/** `enabled=false` evita chamar a API quando o usuário nem pode ter certificado. */
export function useCertificateGetHook(enabled = true) {
  return useQuery({
    queryKey: operacionalQueryKeys.documentCertificate,
    queryFn: CertificateGetService,
    enabled,
  });
}
