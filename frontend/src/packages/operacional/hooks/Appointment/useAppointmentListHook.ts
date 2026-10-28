'use client';

import { useQuery } from '@tanstack/react-query';
import { operacionalQueryKeys } from '@/packages/operacional/helpers/OperacionalQueryKeys';
import { AppointmentListService } from '@/packages/operacional/services/Appointment/AppointmentListService';

function resourceKey(professionalId?: string, chairId?: string): string {
  if (professionalId) return `p:${professionalId}`;
  if (chairId) return `c:${chairId}`;
  return '';
}

export function useAppointmentListHook(input: {
  professionalId?: string;
  chairId?: string;
  all?: boolean;
  from?: string;
  to?: string;
  enabled?: boolean;
}) {
  const professionalId = input.professionalId ?? '';
  const chairId = input.chairId ?? '';
  const from = input.from ?? '';
  const to = input.to ?? '';
  const key = input.all ? 'all' : resourceKey(professionalId, chairId);

  return useQuery({
    queryKey: operacionalQueryKeys.appointments(key, from, to),
    queryFn: () =>
      AppointmentListService({
        ...(professionalId ? { professionalId } : {}),
        ...(chairId ? { chairId } : {}),
        from,
        to,
      }),
    enabled: Boolean(input.enabled ?? true) && Boolean(key && from && to),
  });
}
