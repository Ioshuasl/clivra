import { SubscriptionToneBadge } from '@/packages/admin/components/Subscription/SubscriptionToneBadge';
import { BILLING_METHOD_LABELS, type BillingMethod } from '@/packages/admin/enum/Subscription/BillingMethodEnum';
import type { SubscriptionPaymentTone } from '@/packages/admin/enum/Subscription/SubscriptionPaymentStatusEnum';
import {
  SUBSCRIPTION_STATUS_LABELS,
  type SubscriptionStatus,
} from '@/packages/admin/enum/Subscription/SubscriptionStatusEnum';
import { formatCents } from '@/packages/admin/helpers/FormatCents';
import { formatDateBr, pluralDays, trialDaysLeft } from '@/packages/admin/helpers/SubscriptionFormat';
import type { SubscriptionSummary } from '@/packages/admin/types/Subscription/SubscriptionTypes';
import { ClivraSurface } from '@/shared/layout/ClivraPage';
import { Progress } from '@/shared/ui/progress';

const TRIAL_TOTAL_DAYS = 14;

const STATUS_TONE: Record<SubscriptionStatus, SubscriptionPaymentTone> = {
  ACTIVE: 'success',
  TRIAL: 'warning',
  PAST_DUE: 'danger',
  SUSPENDED: 'danger',
  EXPIRED: 'danger',
  CANCELLED: 'neutral',
};

function dateRow(subscription: SubscriptionSummary): { label: string; value: string } {
  switch (subscription.status) {
    case 'TRIAL':
      return {
        label: subscription.hasRecurringBilling ? 'Primeira cobrança' : 'Fim do teste',
        value: formatDateBr(subscription.trialEndsAt),
      };
    case 'CANCELLED':
      return { label: 'Cancelada em', value: formatDateBr(subscription.cancelAt) };
    case 'ACTIVE':
    case 'PAST_DUE':
      return { label: 'Próxima cobrança', value: formatDateBr(subscription.currentPeriodEnd) };
    default:
      return { label: 'Próxima cobrança', value: '—' };
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

/** Cartão principal (padrão portal de cobrança do Stripe): plano, preço, status e próxima data. */
export function SubscriptionStatusCard({ subscription }: { subscription: SubscriptionSummary }) {
  const status = subscription.status as SubscriptionStatus;
  const label = SUBSCRIPTION_STATUS_LABELS[status] ?? subscription.status;
  const tone = STATUS_TONE[status] ?? 'neutral';
  const date = dateRow(subscription);
  const method = subscription.billingMethod as BillingMethod | null;
  const daysLeft = status === 'TRIAL' ? trialDaysLeft(subscription.trialEndsAt) : null;
  const trialPct =
    daysLeft == null
      ? null
      : Math.min(100, Math.max(0, ((TRIAL_TOTAL_DAYS - daysLeft) / TRIAL_TOTAL_DAYS) * 100));

  return (
    <ClivraSurface
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Plano atual</p>
            <h2 className="text-base font-semibold text-foreground">Clivra {subscription.plan.name}</h2>
          </div>
          <SubscriptionToneBadge tone={tone}>{label}</SubscriptionToneBadge>
        </div>
      }
      contentClassName="grid gap-4 px-4 py-4"
    >
      <p className="flex items-baseline gap-1">
        <span className="text-3xl font-semibold tabular-nums text-foreground">
          {formatCents(subscription.plan.priceCents)}
        </span>
        <span className="text-sm text-muted-foreground">/mês</span>
      </p>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Row label={date.label} value={date.value} />
        <Row label="Forma de pagamento" value={method ? BILLING_METHOD_LABELS[method] : '—'} />
      </dl>
      {trialPct != null && daysLeft != null ? (
        <Progress value={trialPct} className="gap-2" aria-label="Progresso do período de teste">
          <span className="text-xs text-muted-foreground">
            {daysLeft <= 0 ? 'Período de teste encerrado' : `Restam ${pluralDays(daysLeft)} de teste`}
          </span>
        </Progress>
      ) : null}
    </ClivraSurface>
  );
}
