export const BILLING_METHODS = ['PIX', 'CREDIT_CARD', 'BOLETO'] as const;

export type BillingMethod = (typeof BILLING_METHODS)[number];

export const BILLING_METHOD_LABELS: Record<BillingMethod, string> = {
  PIX: 'Pix',
  CREDIT_CARD: 'Cartão de crédito',
  BOLETO: 'Boleto',
};

export const BILLING_METHOD_HINTS: Record<BillingMethod, string> = {
  PIX: 'Aprovação na hora. Enviamos o QR Code todo mês.',
  CREDIT_CARD: 'Cobrança automática todo mês, em ambiente seguro.',
  BOLETO: 'Compensa em 1 a 2 dias úteis. Enviamos todo mês.',
};
