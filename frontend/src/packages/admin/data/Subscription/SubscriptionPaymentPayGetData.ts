import { apiClient } from '@/shared/api/api-client';
import type { SubscriptionPaymentPayView } from '@/packages/admin/types/Subscription/SubscriptionCheckoutTypes';

export async function SubscriptionPaymentPayGetData(
  paymentId: string,
): Promise<SubscriptionPaymentPayView> {
  return apiClient.request<SubscriptionPaymentPayView>(
    `/subscription/payments/${encodeURIComponent(paymentId)}/pay`,
  );
}
