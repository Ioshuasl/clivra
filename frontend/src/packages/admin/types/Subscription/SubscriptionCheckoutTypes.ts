import type { BillingMethod } from '@/packages/admin/enum/Subscription/BillingMethodEnum';

export type SubscriptionCheckoutInput = {
  planCode: string;
  billingMethod: BillingMethod;
  /** Só Pix/boleto; no cartão o Asaas coleta os dados do pagador. */
  cpfCnpj?: string;
};

export type PixPayView = {
  qrCodeBase64: string;
  payload: string;
  expiresAt: string | null;
};

export type BoletoPayView = {
  digitableLine: string | null;
  url: string | null;
};

export type SubscriptionCheckoutPayment = {
  id: string;
  dueDate: string;
  valueCents: number;
  status: string;
  invoiceUrl: string | null;
  pix?: PixPayView;
  boleto?: BoletoPayView;
};

export type SubscriptionCheckoutResult = {
  checkoutId: string;
  billingMethod: BillingMethod;
  status: string;
  /** Cartão: página hospedada do Asaas. */
  redirectUrl?: string;
  /** Pix/boleto: primeira fatura em aberto (pode faltar se o Asaas ainda não a gerou). */
  payment?: SubscriptionCheckoutPayment;
};

export type SubscriptionPayment = {
  id: string;
  externalPaymentId: string;
  status: string;
  valueCents: number;
  dueDate: string;
  paidAt: string | null;
  billingType: string | null;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
};

export type SubscriptionPaymentPayView = {
  paymentId: string;
  billingType: string | null;
  invoiceUrl: string | null;
  pix?: PixPayView;
  boleto?: BoletoPayView;
};

export type SubscriptionCancelInput = { reason?: string };
