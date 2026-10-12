export type SubscriptionPaymentTone = 'success' | 'warning' | 'danger' | 'neutral';

type StatusView = { label: string; tone: SubscriptionPaymentTone };

const VIEWS: Record<string, StatusView> = {
  PENDING: { label: 'Aguardando pagamento', tone: 'warning' },
  AWAITING_RISK_ANALYSIS: { label: 'Em análise', tone: 'warning' },
  CONFIRMED: { label: 'Paga', tone: 'success' },
  RECEIVED: { label: 'Paga', tone: 'success' },
  RECEIVED_IN_CASH: { label: 'Paga', tone: 'success' },
  OVERDUE: { label: 'Vencida', tone: 'danger' },
  REFUNDED: { label: 'Estornada', tone: 'neutral' },
  REFUND_REQUESTED: { label: 'Estorno solicitado', tone: 'neutral' },
  REFUND_IN_PROGRESS: { label: 'Estorno em andamento', tone: 'neutral' },
  PARTIALLY_REFUNDED: { label: 'Estorno parcial', tone: 'neutral' },
  CHARGEBACK_REQUESTED: { label: 'Contestada', tone: 'danger' },
  CHARGEBACK_DISPUTE: { label: 'Em disputa', tone: 'danger' },
  AWAITING_CHARGEBACK_REVERSAL: { label: 'Em disputa', tone: 'danger' },
};

const PAID = new Set(['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH']);
const OPEN = new Set(['PENDING', 'OVERDUE']);

export function subscriptionPaymentView(status: string): StatusView {
  return VIEWS[status] ?? { label: status, tone: 'neutral' };
}

export function isPaymentPaid(status: string): boolean {
  return PAID.has(status);
}

/** Fatura que ainda dá para pagar. */
export function isPaymentOpen(status: string): boolean {
  return OPEN.has(status);
}
