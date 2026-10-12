'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminQueryKeys } from '@/packages/admin/helpers/AdminQueryKeys';
import { SubscriptionCancelService } from '@/packages/admin/services/Subscription/SubscriptionCancelService';

export function useSubscriptionCancelHook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: SubscriptionCancelService,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscription });
    },
  });
}
