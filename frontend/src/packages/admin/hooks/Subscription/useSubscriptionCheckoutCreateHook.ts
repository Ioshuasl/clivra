'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminQueryKeys } from '@/packages/admin/helpers/AdminQueryKeys';
import { SubscriptionCheckoutCreateService } from '@/packages/admin/services/Subscription/SubscriptionCheckoutCreateService';
import type { SubscriptionCheckoutInput } from '@/packages/admin/types/Subscription/SubscriptionCheckoutTypes';

export function useSubscriptionCheckoutCreateHook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { checkoutSchema: SubscriptionCheckoutInput; idempotencyKey: string }) =>
      SubscriptionCheckoutCreateService(variables.checkoutSchema, variables.idempotencyKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscription });
    },
  });
}
