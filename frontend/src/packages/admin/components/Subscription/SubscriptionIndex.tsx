'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { SubscriptionPaymentTable } from '@/packages/admin/components/Subscription/SubscriptionPaymentTable';
import { SubscriptionStatusCard } from '@/packages/admin/components/Subscription/SubscriptionStatusCard';
import { SubscriptionUsageCard } from '@/packages/admin/components/Subscription/SubscriptionUsageCard';
import { isPaymentOpen } from '@/packages/admin/enum/Subscription/SubscriptionPaymentStatusEnum';
import { READ_ONLY_SUBSCRIPTION_STATUSES } from '@/packages/admin/enum/Subscription/SubscriptionStatusEnum';
import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import { formatDateBr, pluralDays, trialDaysLeft } from '@/packages/admin/helpers/SubscriptionFormat';
import { useSubscriptionGetHook } from '@/packages/admin/hooks/Subscription/useSubscriptionGetHook';
import { useSubscriptionPaymentListHook } from '@/packages/admin/hooks/Subscription/useSubscriptionPaymentListHook';
import { useSubscriptionUsageGetHook } from '@/packages/admin/hooks/Subscription/useSubscriptionUsageGetHook';
import { useAuth } from '@/shared/auth/AuthProvider';
import { hasPermission } from '@/shared/auth/permissions';
import { cn } from '@/shared/helpers/utils';
import { ClivraPageHeader, ClivraSurface } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

const POLL_MS = 4_000;

const SubscriptionPaymentPayDialog = dynamic(
  () =>
    import('@/packages/admin/components/Subscription/SubscriptionPaymentPayDialog').then(
      (m) => m.SubscriptionPaymentPayDialog,
    ),
  { ssr: false },
);
const SubscriptionCancelDialog = dynamic(
  () =>
    import('@/packages/admin/components/Subscription/SubscriptionCancelDialog').then(
      (m) => m.SubscriptionCancelDialog,
    ),
  { ssr: false },
);

export function SubscriptionIndex() {
  const { me } = useAuth();
  const canManage = hasPermission(me, 'subscription.manage');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Enquanto o diálogo de pagamento está aberto, acompanha o webhook até a assinatura ativar.
  const subscription = useSubscriptionGetHook(canManage, payingId ? POLL_MS : false);
  const usage = useSubscriptionUsageGetHook(canManage);
  const payments = useSubscriptionPaymentListHook(canManage);

  const status = subscription.data?.status;
  const { refetch: refetchPayments } = payments;
  useEffect(() => {
    if (payingId && status === 'ACTIVE') {
      setPayingId(null);
      void refetchPayments();
    }
  }, [payingId, status, refetchPayments]);

  if (!canManage) {
    return (
      <div className="grid min-w-0 gap-4" data-testid="subscription-page">
        <ClivraPageHeader title="Assinatura" description="Plano, cobranças e uso da clínica." />
        <Alert variant="destructive">
          <AlertDescription>Apenas o dono da clínica gerencia a assinatura.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const data = subscription.data;
  const checkoutAvailable = data?.checkoutAvailable ?? false;
  const isReadOnly = data != null && READ_ONLY_SUBSCRIPTION_STATUSES.has(data.status);
  const daysLeft = data?.status === 'TRIAL' ? trialDaysLeft(data.trialEndsAt) : null;
  const openPayment = [...(payments.data ?? [])]
    .filter((p) => isPaymentOpen(p.status))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const payingPayment = (payments.data ?? []).find((p) => p.id === payingId) ?? null;
  // Teste com cobrança já agendada (cartão cadastrado ou fatura Pix/boleto gerada).
  const scheduled = data?.status === 'TRIAL' && data.hasRecurringBilling;
  const canCancel =
    data != null &&
    data.hasRecurringBilling &&
    (data.status === 'ACTIVE' || data.status === 'PAST_DUE' || data.status === 'TRIAL');

  // Um único CTA primário no cabeçalho, conforme o estado da conta.
  let action: React.ReactNode = null;
  if (data && checkoutAvailable) {
    if (data.status === 'PAST_DUE' && openPayment) {
      action = (
        <Button type="button" className="cursor-pointer" onClick={() => setPayingId(openPayment.id)}>
          Pagar fatura em aberto
        </Button>
      );
    } else if (data.status === 'TRIAL' && !scheduled) {
      action = (
        <Link href="/app/assinatura/checkout" className={cn(buttonVariants(), 'cursor-pointer')}>
          Assinar agora
        </Link>
      );
    } else if (READ_ONLY_SUBSCRIPTION_STATUSES.has(data.status)) {
      action = (
        <Link href="/app/assinatura/checkout" className={cn(buttonVariants(), 'cursor-pointer')}>
          Reativar assinatura
        </Link>
      );
    }
  }

  return (
    <div className="grid min-w-0 gap-4" data-testid="subscription-page">
      <ClivraPageHeader
        title="Assinatura"
        description="Plano, cobranças e uso da clínica."
        action={action}
      />

      {subscription.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : subscription.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{adminErrorMessage(subscription.error)}</AlertDescription>
        </Alert>
      ) : data ? (
        <>
          {!checkoutAvailable && data.status !== 'ACTIVE' ? (
            <Alert data-testid="subscription-checkout-unavailable">
              <AlertTitle>Pagamento online indisponível</AlertTitle>
              <AlertDescription>
                Ainda não é possível assinar por aqui. Fale com o suporte do Clivra para ativar o seu
                plano.
              </AlertDescription>
            </Alert>
          ) : null}

          {isReadOnly ? (
            <Alert variant="destructive" data-testid="subscription-readonly-alert">
              <AlertTitle>Clínica em modo somente leitura</AlertTitle>
              <AlertDescription>
                Você ainda pode consultar dados e exportar relatórios; criar ou editar registros fica
                bloqueado até a assinatura voltar a ficar ativa.
              </AlertDescription>
            </Alert>
          ) : null}

          {data.status === 'PAST_DUE' ? (
            <Alert variant="destructive" data-testid="subscription-pastdue-alert">
              <AlertTitle>Pagamento em atraso</AlertTitle>
              <AlertDescription>
                {openPayment
                  ? `A fatura de ${formatDateBr(openPayment.dueDate)} não foi paga. `
                  : ''}
                Após 7 dias de atraso a clínica passa a ser somente leitura.
              </AlertDescription>
            </Alert>
          ) : null}

          {data.status === 'TRIAL' && daysLeft != null ? (
            <Alert data-testid="subscription-trial-alert">
              <AlertTitle>
                {daysLeft <= 0 ? 'Período de teste encerrado' : `Restam ${pluralDays(daysLeft)} de teste`}
              </AlertTitle>
              <AlertDescription>
                {scheduled
                  ? `Assinatura confirmada: a primeira cobrança será em ${formatDateBr(data.trialEndsAt)}. Você continua com acesso completo até lá.`
                  : 'Assine para manter o acesso completo. Você só paga quando o teste terminar.'}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <SubscriptionStatusCard subscription={data} />
            <SubscriptionUsageCard
              usage={usage.data}
              isLoading={usage.isLoading}
              error={usage.error}
            />
          </div>

          <SubscriptionPaymentTable
            payments={payments.data}
            isLoading={payments.isLoading}
            error={payments.error}
            canPay={checkoutAvailable}
            onPay={setPayingId}
          />

          {canCancel ? (
            <ClivraSurface contentClassName="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {scheduled
                  ? 'Mudou de ideia? Cancele a cobrança agendada e siga só no teste.'
                  : 'Não quer continuar? Você pode cancelar quando quiser, sem multa.'}
              </p>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer text-destructive hover:text-destructive"
                onClick={() => setCancelling(true)}
                data-testid="subscription-cancel-open"
              >
                Cancelar assinatura
              </Button>
            </ClivraSurface>
          ) : null}
        </>
      ) : null}

      {payingPayment ? (
        <SubscriptionPaymentPayDialog payment={payingPayment} onClose={() => setPayingId(null)} />
      ) : null}
      {cancelling ? (
        <SubscriptionCancelDialog scheduled={Boolean(scheduled)} onClose={() => setCancelling(false)} />
      ) : null}
    </div>
  );
}
