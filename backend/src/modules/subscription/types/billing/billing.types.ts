import type { BillingMethod } from '../../enum/billing/billing_method.enum.js';

/** Cobrança normalizada (centavos, data civil `YYYY-MM-DD`). */
export type BillingPayment = {
  id: string;
  subscriptionId: string | null;
  status: string;
  valueCents: number;
  dueDate: string;
  paidAt: Date | null;
  billingType: string | null;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  deleted: boolean;
};

export type BillingSubscription = {
  id: string;
  customerId: string | null;
  billingType: string | null;
  status: string | null;
  nextDueDate: string | null;
  deleted: boolean;
};

export type PixQrCode = {
  encodedImage: string;
  payload: string;
  expirationDate: string | null;
};

export type BoletoInfo = {
  identificationField: string | null;
  bankSlipUrl: string | null;
};

export type BillingCustomerInput = {
  tenantId: string;
  name: string;
  email: string;
  cpfCnpj: string | null;
  mobilePhone: string | null;
};

export type CreateBillingSubscriptionInput = {
  customerId: string;
  billingMethod: Exclude<BillingMethod, 'CREDIT_CARD'>;
  valueCents: number;
  nextDueDate: string;
  description: string;
  externalReference: string;
};

export type CreateCardCheckoutInput = {
  valueCents: number;
  itemName: string;
  description: string;
  nextDueDate: string;
  externalReference: string;
  minutesToExpire: number;
  callback: { successUrl: string; cancelUrl: string; expiredUrl: string };
};

export type CardCheckoutResult = { checkoutId: string; url: string };
