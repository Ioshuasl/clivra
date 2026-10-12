/** Forma de pagamento da assinatura SaaS (ADR-0017). Cartão só via Asaas Checkout. */
export const BillingMethod = {
  PIX: 'PIX',
  BOLETO: 'BOLETO',
  CREDIT_CARD: 'CREDIT_CARD',
} as const;

export type BillingMethod = (typeof BillingMethod)[keyof typeof BillingMethod];

export const BILLING_METHODS = [
  BillingMethod.PIX,
  BillingMethod.BOLETO,
  BillingMethod.CREDIT_CARD,
] as const;
