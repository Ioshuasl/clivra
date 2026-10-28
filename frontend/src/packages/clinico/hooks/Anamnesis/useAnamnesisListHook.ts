'use client';

import { useQuery } from '@tanstack/react-query';
import { clinicoQueryKeys } from '@/packages/clinico/helpers/ClinicoQueryKeys';
import { AnamnesisListService } from '@/packages/clinico/services/Anamnesis/AnamnesisListService';

export function useAnamnesisListHook(patientId: string) {
  return useQuery({
    queryKey: clinicoQueryKeys.anamnesis(patientId),
    queryFn: () => AnamnesisListService(patientId),
    retry: false,
  });
}
