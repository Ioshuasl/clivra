'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicoQueryKeys } from '@/packages/clinico/helpers/ClinicoQueryKeys';
import { TreatmentItemCreateService } from '@/packages/clinico/services/TreatmentPlan/TreatmentItemCreateService';

export function useTreatmentItemCreateHook(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: TreatmentItemCreateService,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clinicoQueryKeys.treatmentPlans(patientId) });
      await queryClient.invalidateQueries({ queryKey: ['clinico-treatment-plan'] });
    },
  });
}
