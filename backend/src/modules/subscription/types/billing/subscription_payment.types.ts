export type SubscriptionPaymentRow = {
  id: string;
  subscriptionId: string;
  externalPaymentId: string;
  status: string;
  valueCents: number;
  dueDate: string;
  paidAt: string | null;
  billingType: string | null;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  deleted: boolean;
  createdAt: string;
};

export type SubscriptionCheckoutRow = {
  id: string;
  tenantId: string;
  idempotencyKey: string;
  planId: string;
  billingMethod: string;
  status: string;
  externalCheckoutId: string | null;
  url: string | null;
  expiresAt: string | null;
};

export type AsaasEventRow = {
  id: string;
  asaasEventId: string;
  event: string;
  tenantId: string | null;
  payload: unknown;
  status: string;
  attempts: number;
  receivedAt: Date;
};

export type SubscriptionBillingRow = {
  id: string;
  tenantId: string;
  planId: string;
  status: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  externalCustomerId: string | null;
  externalSubscriptionId: string | null;
  billingMethod: string | null;
  billingProvider: string;
  timezone: string;
};

export type BillingProfile = {
  tenantName: string;
  legalName: string | null;
  taxId: string | null;
  timezone: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string | null;
};
