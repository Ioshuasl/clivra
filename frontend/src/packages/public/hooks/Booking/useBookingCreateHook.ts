'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClientError } from '@/shared/api/api-client';
import { BookingCreateService } from '@/packages/public/services/Booking/BookingCreateService';

export function useBookingCreateHook() {
  const queryClient = useQueryClient();

  return useMutation({
    // A própria tela mostra o erro junto ao formulário.
    meta: { silent: true },
    mutationFn: BookingCreateService,
    onError: async (error) => {
      if (error instanceof ApiClientError && error.code === 'SLOT_UNAVAILABLE') {
        await queryClient.invalidateQueries({ queryKey: ['public-availability'] });
      }
    },
  });
}
