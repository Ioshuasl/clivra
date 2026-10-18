'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PatientCreateFormValues } from '@/packages/operacional/schemas/Patient/PatientSchema';
import { PatientCreateService } from '@/packages/operacional/services/Patient/PatientCreateService';

export function usePatientCreateHook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patientSchema: PatientCreateFormValues) => PatientCreateService(patientSchema),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}
