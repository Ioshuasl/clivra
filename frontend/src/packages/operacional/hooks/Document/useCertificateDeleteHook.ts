'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { operacionalQueryKeys } from '@/packages/operacional/helpers/OperacionalQueryKeys';
import { CertificateDeleteService } from '@/packages/operacional/services/Document/CertificateDeleteService';

export function useCertificateDeleteHook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: CertificateDeleteService,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: operacionalQueryKeys.documentCertificate });
    },
  });
}
