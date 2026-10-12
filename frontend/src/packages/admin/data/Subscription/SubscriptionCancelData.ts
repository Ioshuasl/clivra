import { apiClient } from '@/shared/api/api-client';
import type { SubscriptionCancelInput } from '@/packages/admin/types/Subscription/SubscriptionCheckoutTypes';

export async function SubscriptionCancelData(
  cancelSchema: SubscriptionCancelInput,
): Promise<{ status: string }> {
  return apiClient.request<{ status: string }>('/subscription/cancel', {
    method: 'POST',
    body: JSON.stringify(cancelSchema),
  });
}
