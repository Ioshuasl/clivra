'use client';

import { useQuery } from '@tanstack/react-query';
import { adminQueryKeys } from '@/packages/admin/helpers/AdminQueryKeys';
import { SubscriptionPaymentListService } from '@/packages/admin/services/Subscription/SubscriptionPaymentListService';

export function useSubscriptionPaymentListHook(enabled = true) {
  return useQuery({
    queryKey: adminQueryKeys.subscriptionPayments,
    queryFn: () => SubscriptionPaymentListService(),
    enabled,
  });
}
