'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { operacionalQueryKeys } from '@/packages/operacional/helpers/OperacionalQueryKeys';
import { CertificateUpdateService } from '@/packages/operacional/services/Document/CertificateUpdateService';

export function useCertificateUpdateHook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: CertificateUpdateService,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: operacionalQueryKeys.documentCertificate });
    },
  });
}
