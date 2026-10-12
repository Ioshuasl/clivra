export type CheckoutPaymentView = {
  id: string;
  dueDate: string;
  valueCents: number;
  status: string;
  invoiceUrl: string | null;
  pix?: { qrCodeBase64: string; payload: string; expiresAt: string | null };
  boleto?: { digitableLine: string | null; url: string | null };
};

export type CheckoutResult = {
  checkoutId: string;
  billingMethod: string;
  status: string;
  /** Cartão: URL do Asaas Checkout. */
  redirectUrl?: string;
  /** Pix/boleto: primeira cobrança em aberto (pode faltar se o Asaas ainda não a gerou). */
  payment?: CheckoutPaymentView;
};

export type PaymentPayView = {
  paymentId: string;
  billingType: string | null;
  pix?: { qrCodeBase64: string; payload: string; expiresAt: string | null };
  boleto?: { digitableLine: string | null; url: string | null };
  invoiceUrl: string | null;
};

export type RecomputeResult = {
  changed: boolean;
  from: string;
  to: string;
  readOnly: boolean;
  paidNow: boolean;
};
