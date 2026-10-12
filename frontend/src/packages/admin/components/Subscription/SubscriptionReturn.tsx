'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircleIcon, ClockIcon } from 'lucide-react';
import { CheckoutSuccess } from '@/packages/admin/components/Subscription/CheckoutSuccess';
import { formatDateBr } from '@/packages/admin/helpers/SubscriptionFormat';
import { useSubscriptionGetHook } from '@/packages/admin/hooks/Subscription/useSubscriptionGetHook';
import { useAuth } from '@/shared/auth/AuthProvider';
import { hasPermission } from '@/shared/auth/permissions';
import { cn } from '@/shared/helpers/utils';
import { ClivraPageHeader, ClivraSurface } from '@/shared/layout/ClivraPage';
import { buttonVariants } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';

const POLL_MS = 3_000;
const GIVE_UP_MS = 120_000;

function ReturnMessage({
  title,
  description,
  testId,
}: {
  title: string;
  description: string;
  testId: string;
}) {
  return (
    <ClivraSurface contentClassName="grid justify-items-center gap-4 px-6 py-12 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-warning/10 text-warning" aria-hidden>
        <AlertCircleIcon className="size-7" />
      </div>
      <div className="grid gap-1" data-testid={testId}>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <Link
        href="/app/assinatura/checkout"
        className={cn(buttonVariants(), 'cursor-pointer')}
      >
        Tentar de novo
      </Link>
    </ClivraSurface>
  );
}

function SubscriptionReturnBody() {
  const params = useSearchParams();
  const returned = params.get('status');
  const { me } = useAuth();
  const canManage = hasPermission(me, 'subscription.manage');
  const [gaveUp, setGaveUp] = useState(false);

  // O retorno do navegador NÃO prova o pagamento: só o webhook ativa a assinatura.
  const [scheduled, setScheduled] = useState(false);
  const waiting = returned === 'success' && !gaveUp && !scheduled;
  const subscription = useSubscriptionGetHook(canManage && returned === 'success', waiting ? POLL_MS : false);
  const subData = subscription.data;
  // Cartão cadastrado durante o teste: a recorrência existe, mas a 1ª cobrança é só no fim do teste.
  const cardScheduled =
    subData?.status === 'TRIAL' && subData.hasRecurringBilling && subData.billingMethod === 'CREDIT_CARD';
  useEffect(() => {
    if (cardScheduled) setScheduled(true);
  }, [cardScheduled]);

  useEffect(() => {
    if (returned !== 'success') return;
    const timer = window.setTimeout(() => setGaveUp(true), GIVE_UP_MS);
    return () => window.clearTimeout(timer);
  }, [returned]);

  if (returned === 'cancel') {
    return (
      <ReturnMessage
        testId="return-cancelled"
        title="Pagamento não concluído"
        description="Você saiu antes de finalizar. Nada foi cobrado — quando quiser, é só tentar de novo."
      />
    );
  }
  if (returned === 'expired') {
    return (
      <ReturnMessage
        testId="return-expired"
        title="O link de pagamento expirou"
        description="Por segurança o link vale por 1 hora. Gere um novo para continuar."
      />
    );
  }

  if (subscription.data?.status === 'ACTIVE') {
    return <CheckoutSuccess planName={subscription.data.plan.name} />;
  }
  if (cardScheduled && subData) {
    return (
      <CheckoutSuccess planName={subData.plan.name} firstChargeDate={formatDateBr(subData.trialEndsAt)} />
    );
  }

  return (
    <ClivraSurface contentClassName="grid justify-items-center gap-4 px-6 py-12 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground" aria-hidden>
        {gaveUp ? <ClockIcon className="size-7" /> : <Spinner className="size-7" />}
      </div>
      <div className="grid gap-1" data-testid="return-confirming">
        <h2 className="text-xl font-semibold text-foreground">
          {gaveUp ? 'Ainda estamos confirmando' : 'Confirmando seu pagamento…'}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {gaveUp
            ? 'O banco ainda não nos avisou. Assim que confirmar, sua assinatura ativa sozinha e você recebe um e-mail. Pode fechar esta página.'
            : 'Isso costuma levar alguns segundos. Não feche esta página.'}
        </p>
      </div>
      <Link
        href="/app/assinatura"
        className={cn(buttonVariants({ variant: 'outline' }), 'cursor-pointer')}
      >
        Ver minha assinatura
      </Link>
    </ClivraSurface>
  );
}

export function SubscriptionReturn() {
  return (
    <div className="grid min-w-0 gap-4" data-testid="subscription-return">
      <ClivraPageHeader title="Assinatura" description="Resultado do seu pagamento." />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
        <SubscriptionReturnBody />
      </Suspense>
    </div>
  );
}
