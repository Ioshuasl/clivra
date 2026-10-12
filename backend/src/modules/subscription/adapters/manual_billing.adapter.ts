import { BillingProvider } from '../enum/billing/billing_provider.enum.js';
import { BillingUnavailableError } from '../models/errors/subscription.errors.js';
import type { SubscriptionBillingPort } from '../types/ports/subscription_billing.port.js';

/**
 * Cobrança manual (ADR-0010, contingência do ADR-0017): não existe gateway.
 * A operação continua ativando/suspendendo por `POST /subscription/ops/status`.
 */
export class ManualBillingAdapter implements SubscriptionBillingPort {
  readonly provider = BillingProvider.MANUAL;

  ensureCustomer(): Promise<never> {
    return Promise.reject(new BillingUnavailableError());
  }
  createSubscription(): Promise<never> {
    return Promise.reject(new BillingUnavailableError());
  }
  createCardCheckout(): Promise<never> {
    return Promise.reject(new BillingUnavailableError());
  }
  getSubscription(): Promise<never> {
    return Promise.reject(new BillingUnavailableError());
  }
  findSubscriptionByReference(): Promise<never> {
    return Promise.reject(new BillingUnavailableError());
  }
  listSubscriptionPayments(): Promise<never> {
    return Promise.reject(new BillingUnavailableError());
  }
  getPixQrCode(): Promise<never> {
    return Promise.reject(new BillingUnavailableError());
  }
  getBoleto(): Promise<never> {
    return Promise.reject(new BillingUnavailableError());
  }
  updateSubscriptionValue(): Promise<never> {
    return Promise.reject(new BillingUnavailableError());
  }
  cancelSubscription(): Promise<never> {
    return Promise.reject(new BillingUnavailableError());
  }
}
