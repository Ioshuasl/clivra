import type { BillingProvider } from '../../enum/billing/billing_provider.enum.js';
import type {
  BillingCustomerInput,
  BillingPayment,
  BillingSubscription,
  BoletoInfo,
  CardCheckoutResult,
  CreateBillingSubscriptionInput,
  CreateCardCheckoutInput,
  PixQrCode,
} from '../billing/billing.types.js';

/** Porta de cobrança da assinatura SaaS (ADR-0017). Adapters: Asaas e Manual. */
export type SubscriptionBillingPort = {
  readonly provider: BillingProvider;
  ensureCustomer(input: BillingCustomerInput): Promise<{ customerId: string; created: boolean }>;
  createSubscription(input: CreateBillingSubscriptionInput): Promise<{ subscriptionId: string }>;
  createCardCheckout(input: CreateCardCheckoutInput): Promise<CardCheckoutResult>;
  getSubscription(subscriptionId: string): Promise<BillingSubscription>;
  /** Procura assinatura já criada (retry após timeout não pode duplicar). */
  findSubscriptionByReference(
    customerId: string,
    externalReference: string,
  ): Promise<BillingSubscription | null>;
  listSubscriptionPayments(subscriptionId: string): Promise<BillingPayment[]>;
  getPixQrCode(paymentId: string): Promise<PixQrCode>;
  getBoleto(paymentId: string): Promise<BoletoInfo>;
  updateSubscriptionValue(
    subscriptionId: string,
    valueCents: number,
    updatePendingPayments?: boolean,
  ): Promise<void>;
  cancelSubscription(subscriptionId: string): Promise<void>;
};
