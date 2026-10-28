'use client';

import { useQuery } from '@tanstack/react-query';
import { clinicoQueryKeys } from '@/packages/clinico/helpers/ClinicoQueryKeys';
import { AnamnesisFormResolveService } from '@/packages/clinico/services/Anamnesis/AnamnesisFormResolveService';

export function useAnamnesisFormResolveHook(professionalId?: string) {
  return useQuery({
    queryKey: clinicoQueryKeys.anamnesisForm(professionalId),
    queryFn: () => AnamnesisFormResolveService(professionalId),
    retry: false,
  });
}
