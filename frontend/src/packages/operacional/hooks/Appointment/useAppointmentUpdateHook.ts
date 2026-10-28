'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { operacionalQueryKeys } from '@/packages/operacional/helpers/OperacionalQueryKeys';
import { AppointmentUpdateService } from '@/packages/operacional/services/Appointment/AppointmentUpdateService';
import type {
  AppointmentSummary,
  AppointmentUpdateInput,
} from '@/packages/operacional/types/Appointment/AppointmentTypes';

export function useAppointmentUpdateHook(listKey: {
  professionalId?: string;
  chairId?: string;
  all?: boolean;
  from: string;
  to: string;
}) {
  const queryClient = useQueryClient();
  const resourceKey = listKey.all
    ? 'all'
    : listKey.professionalId
      ? `p:${listKey.professionalId}`
      : `c:${listKey.chairId ?? ''}`;
  const key = operacionalQueryKeys.appointments(resourceKey, listKey.from, listKey.to);

  return useMutation({
    mutationFn: (input: { appointmentId: string; appointmentSchema: AppointmentUpdateInput }) =>
      AppointmentUpdateService(input.appointmentId, input.appointmentSchema),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AppointmentSummary[]>(key);
      if (previous) {
        queryClient.setQueryData<AppointmentSummary[]>(
          key,
          previous.map((item) =>
            item.id === input.appointmentId
              ? {
                  ...item,
                  startsAt: input.appointmentSchema.startsAt ?? item.startsAt,
                  endsAt: input.appointmentSchema.endsAt ?? item.endsAt,
                }
              : item,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
