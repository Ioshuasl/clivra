import {
  PAID_PAYMENT_STATUSES,
  PaymentStatus,
} from '../../enum/billing/payment_status.enum.js';
import { SubscriptionStatus } from '../../enum/subscription/subscription_status.enum.js';

export type PaymentFact = {
  status: string;
  /** `YYYY-MM-DD` */
  dueDate: string;
  deleted: boolean;
};

export type DeriveBillingStatusInput = {
  current: string;
  payments: readonly PaymentFact[];
  /** Data civil de hoje no fuso do tenant (`YYYY-MM-DD`). */
  today: string;
};

export type DerivedBillingStatus = {
  status: string;
  /** Vencimento da cobrança de referência quando paga (base do próximo período). */
  paidReferenceDueDate: string | null;
};

/** Dias de cobrança vencida em aberto até a suspensão (módulo 10 §3: PAST_DUE até 7 dias). */
export const PAST_DUE_GRACE_DAYS = 7;

/** Cobrança paga há mais que isso não reativa sozinha uma assinatura (evita ressuscitar histórico antigo). */
const MAX_REFERENCE_AGE_DAYS = 62;

function ageInDays(from: string, to: string): number {
  const a = Date.parse(`${from}T12:00:00.000Z`);
  const b = Date.parse(`${to}T12:00:00.000Z`);
  return Math.round((b - a) / 86_400_000);
}

/**
 * Estado da assinatura derivado das cobranças — não da ordem dos eventos (ADR-0017, D5).
 *
 * - qualquer cobrança vencida e não paga → PAST_DUE (só a partir de ACTIVE; os demais status se mantêm);
 * - sem atraso aberto e a cobrança de referência paga → ACTIVE (de TRIAL/PAST_DUE/SUSPENDED/EXPIRED/ACTIVE);
 * - qualquer outro caso mantém o status atual. CANCELLED nunca é revertido por evento.
 *
 * A cobrança de referência é a de maior vencimento entre as já vencidas ou pagas.
 */
export function deriveBillingStatus(input: DeriveBillingStatusInput): DerivedBillingStatus {
  const keep: DerivedBillingStatus = { status: input.current, paidReferenceDueDate: null };
  if (input.current === SubscriptionStatus.CANCELLED) return keep;

  const live = input.payments.filter((p) => !p.deleted);

  const hasOpenOverdue = live.some(
    (p) => p.status === PaymentStatus.OVERDUE && p.dueDate <= input.today,
  );
  if (hasOpenOverdue) {
    return input.current === SubscriptionStatus.ACTIVE
      ? { status: SubscriptionStatus.PAST_DUE, paidReferenceDueDate: null }
      : keep;
  }

  const isPaid = (p: PaymentFact) => PAID_PAYMENT_STATUSES.has(p.status);
  const candidates = live.filter((p) => p.dueDate <= input.today || isPaid(p));
  if (candidates.length === 0) return keep;

  const reference = candidates.reduce((best, p) => {
    if (p.dueDate > best.dueDate) return p;
    if (p.dueDate === best.dueDate && isPaid(p) && !isPaid(best)) return p;
    return best;
  });
  if (!isPaid(reference)) return keep;
  if (ageInDays(reference.dueDate, input.today) > MAX_REFERENCE_AGE_DAYS) return keep;
  return { status: SubscriptionStatus.ACTIVE, paidReferenceDueDate: reference.dueDate };
}
