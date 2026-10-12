import { env } from '../../../shared/config/env.js';
import type { SubscriptionBillingPort } from '../types/ports/subscription_billing.port.js';
import { AsaasBillingAdapter } from './asaas_billing.adapter.js';
import { ManualBillingAdapter } from './manual_billing.adapter.js';

let override: SubscriptionBillingPort | undefined;
let singleton: SubscriptionBillingPort | undefined;

/** Escolhe o adapter por `BILLING_PROVIDER` (kill switch: `manual`). */
export function getBillingAdapter(): SubscriptionBillingPort {
  if (override) return override;
  if (!singleton) {
    singleton = env.BILLING_PROVIDER === 'asaas' ? new AsaasBillingAdapter() : new ManualBillingAdapter();
  }
  return singleton;
}

/** Injeção para testes. */
export function setBillingAdapter(adapter: SubscriptionBillingPort | undefined): void {
  override = adapter;
}

export function isAsaasEnabled(): boolean {
  return getBillingAdapter().provider === 'ASAAS';
}
