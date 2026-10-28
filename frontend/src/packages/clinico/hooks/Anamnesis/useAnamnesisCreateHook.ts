'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicoQueryKeys } from '@/packages/clinico/helpers/ClinicoQueryKeys';
import { AnamnesisCreateService } from '@/packages/clinico/services/Anamnesis/AnamnesisCreateService';
import type { AnamnesisCreateInput } from '@/packages/clinico/types/Anamnesis/AnamnesisTypes';

export function useAnamnesisCreateHook(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (anamnesisSchema: AnamnesisCreateInput) =>
      AnamnesisCreateService(patientId, anamnesisSchema),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clinicoQueryKeys.anamnesis(patientId) });
      await queryClient.invalidateQueries({ queryKey: clinicoQueryKeys.medicalRecord(patientId) });
    },
  });
}
