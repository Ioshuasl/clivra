'use client';

import { useMutation } from '@tanstack/react-query';
import { WaitlistAcceptCreateService } from '@/packages/public/services/WaitlistAccept/WaitlistAcceptCreateService';

export function useWaitlistAcceptCreateHook() {
  return useMutation({
    // A própria tela mostra o erro junto ao formulário.
    meta: { silent: true },
    mutationFn: WaitlistAcceptCreateService,
  });
}
