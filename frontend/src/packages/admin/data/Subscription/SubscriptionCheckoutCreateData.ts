import { apiClient } from '@/shared/api/api-client';
import type {
  SubscriptionCheckoutInput,
  SubscriptionCheckoutResult,
} from '@/packages/admin/types/Subscription/SubscriptionCheckoutTypes';

export async function SubscriptionCheckoutCreateData(
  checkoutSchema: SubscriptionCheckoutInput,
  idempotencyKey: string,
): Promise<SubscriptionCheckoutResult> {
  return apiClient.request<SubscriptionCheckoutResult>('/subscription/checkout', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(checkoutSchema),
  });
}
