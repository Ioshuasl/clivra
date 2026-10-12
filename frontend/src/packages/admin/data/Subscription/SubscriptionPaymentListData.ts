import { apiClient } from '@/shared/api/api-client';
import type { SubscriptionPayment } from '@/packages/admin/types/Subscription/SubscriptionCheckoutTypes';

export async function SubscriptionPaymentListData(limit = 12): Promise<SubscriptionPayment[]> {
  return apiClient.request<SubscriptionPayment[]>(`/subscription/payments?limit=${limit}`);
}
