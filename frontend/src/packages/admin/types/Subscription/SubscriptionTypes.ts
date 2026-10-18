import type { SubscriptionStatus } from '@/packages/admin/enum/Subscription/SubscriptionStatusEnum';
import type { UsageMetric } from '@/packages/admin/enum/Subscription/UsageMetricEnum';

export type PlanLimits = {
  professionals: number | null;
  adminUsers: number | null;
  units: number | null;
  storageGb: number | null;
  messagesMonth: number | null;
};

export type PlanSummary = {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  interval: string;
  limits: PlanLimits;
  active: boolean;
};

export type SubscriptionSummary = {
  id: string;
  tenantId: string;
  status: SubscriptionStatus | (string & {});
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  /** PIX | BOLETO | CREDIT_CARD (null = cobrança manual). */
  billingMethod: string | null;
  billingProvider: string;
  /** Há recorrência no gateway: habilita cancelar pelo app. */
  hasRecurringBilling: boolean;
  /** Pagamento online ligado no servidor (BILLING_PROVIDER=asaas). */
  checkoutAvailable: boolean;
  plan: PlanSummary;
  createdAt: string;
  updatedAt: string;
};

export type UsageItem = {
  metric: UsageMetric | (string & {});
  current: number;
  limit: number | null;
  period: string;
};

export type UsageSummary = {
  items: UsageItem[];
};
