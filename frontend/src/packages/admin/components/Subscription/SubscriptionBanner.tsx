'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  READ_ONLY_SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_LABELS,
  type SubscriptionStatus,
} from '@/packages/admin/enum/Subscription/SubscriptionStatusEnum';
import { pluralDays, trialDaysLeft } from '@/packages/admin/helpers/SubscriptionFormat';
import { useSubscriptionGetHook } from '@/packages/admin/hooks/Subscription/useSubscriptionGetHook';
import { useAuth } from '@/shared/auth/AuthProvider';
import { hasPermission } from '@/shared/auth/permissions';
import { buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/helpers/utils';

function statusLabel(status: string): string {
  return SUBSCRIPTION_STATUS_LABELS[status as SubscriptionStatus] ?? status;
}

/** Banner global: trial curto, atraso ou suspensão (só quem tem subscription.manage). */
export function SubscriptionBanner() {
  const { me } = useAuth();
  const canManage = hasPermission(me, 'subscription.manage');
  const subscription = useSubscriptionGetHook(canManage);
  const pathname = usePathname();

  // Nas telas de assinatura o próprio conteúdo já explica o estado e traz o CTA (evita dois botões primários).
  if (!canManage || !subscription.data || pathname.includes('/assinatura')) return null;

  const { status, trialEndsAt, checkoutAvailable } = subscription.data;
  const daysLeft = trialDaysLeft(trialEndsAt);
  const isReadOnly = READ_ONLY_SUBSCRIPTION_STATUSES.has(status);
  const trialWarning = status === 'TRIAL' && daysLeft != null && daysLeft <= 3;
  const pastDue = status === 'PAST_DUE';

  if (!isReadOnly && !trialWarning && !pastDue) return null;

  // Atraso: a fatura em aberto é paga em Assinatura. Demais casos: direto ao checkout (se ligado).
  const href = pastDue || !checkoutAvailable ? '/app/assinatura' : '/app/assinatura/checkout';
  const cta = pastDue ? 'Pagar fatura' : isReadOnly ? 'Reativar assinatura' : 'Assinar agora';

  if (isReadOnly) {
    return (
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3"
        data-testid="subscription-banner-readonly"
        role="status"
      >
        <div className="grid gap-1">
          <p className="text-sm font-medium">
            Conta {statusLabel(status).toLowerCase()} — somente leitura
          </p>
          <p className="text-xs text-muted-foreground">
            Consultas e exportações liberadas; alterações bloqueadas até reativar.
          </p>
        </div>
        <Link href={href} className={cn(buttonVariants({ size: 'sm' }), 'cursor-pointer')}>
          {cta}
        </Link>
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3"
      data-testid="subscription-banner-trial"
      role="status"
    >
      <div className="grid gap-1">
        <p className="text-sm font-medium">
          {pastDue
            ? 'Pagamento em atraso'
            : daysLeft != null && daysLeft <= 0
              ? 'Período de teste encerrado'
              : `Teste termina em ${pluralDays(daysLeft ?? 0)}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {pastDue
            ? 'Pague a fatura em aberto para evitar a suspensão da conta.'
            : 'Assine para manter o acesso completo sem interrupção.'}
        </p>
      </div>
      <Link href={href} className={cn(buttonVariants({ size: 'sm' }), 'cursor-pointer')}>
        {cta}
      </Link>
    </div>
  );
}
