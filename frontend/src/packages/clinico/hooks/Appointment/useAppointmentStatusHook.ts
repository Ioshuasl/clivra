'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicoQueryKeys } from '@/packages/clinico/helpers/ClinicoQueryKeys';
import { AppointmentStatusService } from '@/packages/clinico/services/Appointment/AppointmentStatusService';
import type { AppointmentStatusInput } from '@/packages/clinico/types/Appointment/AppointmentTypes';

export function useAppointmentStatusHook(appointmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (statusSchema: AppointmentStatusInput) =>
      AppointmentStatusService(appointmentId, statusSchema),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clinicoQueryKeys.appointment(appointmentId) });
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
