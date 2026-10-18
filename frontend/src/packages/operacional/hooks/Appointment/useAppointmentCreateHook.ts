'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppointmentCreateService } from '@/packages/operacional/services/Appointment/AppointmentCreateService';
import { AppointmentSeriesCreateService } from '@/packages/operacional/services/Appointment/AppointmentSeriesService';
import type {
  AppointmentCreateInput,
  AppointmentSeriesCreateInput,
} from '@/packages/operacional/types/Appointment/AppointmentTypes';

export function useAppointmentCreateHook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentSchema: AppointmentCreateInput) =>
      AppointmentCreateService(appointmentSchema, crypto.randomUUID()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useAppointmentSeriesCreateHook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seriesSchema: AppointmentSeriesCreateInput) =>
      AppointmentSeriesCreateService(seriesSchema),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
