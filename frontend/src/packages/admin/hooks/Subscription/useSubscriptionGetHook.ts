'use client';

import { useQuery } from '@tanstack/react-query';
import { adminQueryKeys } from '@/packages/admin/helpers/AdminQueryKeys';
import { SubscriptionGetService } from '@/packages/admin/services/Subscription/SubscriptionGetService';

/** `refetchIntervalMs`: usado enquanto se espera o webhook confirmar o pagamento. */
export function useSubscriptionGetHook(enabled = true, refetchIntervalMs: number | false = false) {
  return useQuery({
    queryKey: adminQueryKeys.subscription,
    queryFn: () => SubscriptionGetService(),
    enabled,
    refetchInterval: refetchIntervalMs,
  });
}
