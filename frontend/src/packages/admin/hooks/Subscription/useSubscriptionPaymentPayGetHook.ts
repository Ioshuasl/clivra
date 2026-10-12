'use client';

import { useQuery } from '@tanstack/react-query';
import { adminQueryKeys } from '@/packages/admin/helpers/AdminQueryKeys';
import { SubscriptionPaymentPayGetService } from '@/packages/admin/services/Subscription/SubscriptionPaymentPayGetService';

export function useSubscriptionPaymentPayGetHook(paymentId: string | null) {
  return useQuery({
    queryKey: adminQueryKeys.subscriptionPaymentPay(paymentId ?? ''),
    queryFn: () => SubscriptionPaymentPayGetService(paymentId!),
    enabled: Boolean(paymentId),
  });
}
