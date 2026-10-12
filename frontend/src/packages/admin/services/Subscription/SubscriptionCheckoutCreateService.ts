import { SubscriptionCheckoutCreateData } from '@/packages/admin/data/Subscription/SubscriptionCheckoutCreateData';
import type { SubscriptionCheckoutInput } from '@/packages/admin/types/Subscription/SubscriptionCheckoutTypes';

export async function SubscriptionCheckoutCreateService(
  checkoutSchema: SubscriptionCheckoutInput,
  idempotencyKey: string,
) {
  return SubscriptionCheckoutCreateData(
    {
      ...checkoutSchema,
      cpfCnpj: checkoutSchema.cpfCnpj?.replace(/\D/g, '') || undefined,
    },
    idempotencyKey,
  );
}
