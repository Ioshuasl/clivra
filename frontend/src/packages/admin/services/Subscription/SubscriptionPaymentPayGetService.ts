import { SubscriptionPaymentPayGetData } from '@/packages/admin/data/Subscription/SubscriptionPaymentPayGetData';

export async function SubscriptionPaymentPayGetService(paymentId: string) {
  return SubscriptionPaymentPayGetData(paymentId);
}
