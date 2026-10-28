'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicoQueryKeys } from '@/packages/clinico/helpers/ClinicoQueryKeys';
import { PatientUpdateService } from '@/packages/clinico/services/Patient/PatientUpdateService';
import type { AttendancePatientUpdateInput } from '@/packages/clinico/types/Patient/PatientTypes';

export function usePatientUpdateHook(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patientSchema: AttendancePatientUpdateInput) =>
      PatientUpdateService(patientId, patientSchema),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clinicoQueryKeys.patient(patientId) });
      await queryClient.invalidateQueries({ queryKey: ['patients'] });
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
