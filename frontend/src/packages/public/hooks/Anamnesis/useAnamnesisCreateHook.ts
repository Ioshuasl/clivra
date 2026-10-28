'use client';

import { useMutation } from '@tanstack/react-query';
import { AnamnesisCreateService } from '@/packages/public/services/Anamnesis/AnamnesisCreateService';

export function useAnamnesisCreateHook() {
  return useMutation({
    // A própria tela mostra o erro junto ao formulário.
    meta: { silent: true },
    mutationFn: AnamnesisCreateService,
  });
}
