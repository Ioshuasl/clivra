/** Status de cobrança do Asaas relevantes para a assinatura (docs.asaas.com — eventos de cobrança). */
export const PaymentStatus = {
  PENDING: 'PENDING',
  AWAITING_RISK_ANALYSIS: 'AWAITING_RISK_ANALYSIS',
  CONFIRMED: 'CONFIRMED',
  RECEIVED: 'RECEIVED',
  RECEIVED_IN_CASH: 'RECEIVED_IN_CASH',
  OVERDUE: 'OVERDUE',
  REFUNDED: 'REFUNDED',
  REFUND_REQUESTED: 'REFUND_REQUESTED',
  REFUND_IN_PROGRESS: 'REFUND_IN_PROGRESS',
  CHARGEBACK_REQUESTED: 'CHARGEBACK_REQUESTED',
  CHARGEBACK_DISPUTE: 'CHARGEBACK_DISPUTE',
  AWAITING_CHARGEBACK_REVERSAL: 'AWAITING_CHARGEBACK_REVERSAL',
} as const;

/** Cobrança paga. No cartão, CONFIRMED já vale; RECEIVED só chega ~32 dias depois. */
export const PAID_PAYMENT_STATUSES: ReadonlySet<string> = new Set([
  PaymentStatus.CONFIRMED,
  PaymentStatus.RECEIVED,
  PaymentStatus.RECEIVED_IN_CASH,
]);

/** Um evento atrasado de pendente/vencido não pode desfazer uma cobrança já paga. */
export const NOT_REGRESSIVE_FROM_PAID: ReadonlySet<string> = new Set([
  PaymentStatus.PENDING,
  PaymentStatus.OVERDUE,
  PaymentStatus.AWAITING_RISK_ANALYSIS,
]);

export const CheckoutStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
  FAILED: 'FAILED',
} as const;

export type CheckoutStatus = (typeof CheckoutStatus)[keyof typeof CheckoutStatus];
