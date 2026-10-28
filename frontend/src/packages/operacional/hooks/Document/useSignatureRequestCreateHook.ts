'use client';

import { useMutation } from '@tanstack/react-query';
import { SignatureRequestCreateService } from '@/packages/operacional/services/Document/SignatureRequestCreateService';

export function useSignatureRequestCreateHook() {
  return useMutation({ mutationFn: SignatureRequestCreateService });
}
