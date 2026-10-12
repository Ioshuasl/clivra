import type { SubscriptionCheckout } from '@prisma/client';
import type { SubscriptionCheckoutRow } from '../../../types/billing/subscription_payment.types.js';

export function mapSubscriptionCheckout(row: SubscriptionCheckout): SubscriptionCheckoutRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    idempotencyKey: row.idempotencyKey,
    planId: row.planId,
    billingMethod: row.billingMethod,
    status: row.status,
    externalCheckoutId: row.externalCheckoutId,
    url: row.url,
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}
