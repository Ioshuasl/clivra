import { SubscriptionCancelData } from '@/packages/admin/data/Subscription/SubscriptionCancelData';
import type { SubscriptionCancelInput } from '@/packages/admin/types/Subscription/SubscriptionCheckoutTypes';

export async function SubscriptionCancelService(cancelSchema: SubscriptionCancelInput) {
  return SubscriptionCancelData({ reason: cancelSchema.reason?.trim() || undefined });
}
