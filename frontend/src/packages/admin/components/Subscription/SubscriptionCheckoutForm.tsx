'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { CheckoutMethodOption } from '@/packages/admin/components/Subscription/CheckoutMethodOption';
import { CheckoutPlanOption } from '@/packages/admin/components/Subscription/CheckoutPlanOption';
import { CheckoutSuccess } from '@/packages/admin/components/Subscription/CheckoutSuccess';
import { CheckoutSummary } from '@/packages/admin/components/Subscription/CheckoutSummary';
import { PaymentBoletoPanel } from '@/packages/admin/components/Subscription/PaymentBoletoPanel';
import { PaymentPixPanel } from '@/packages/admin/components/Subscription/PaymentPixPanel';
import {
  BILLING_METHODS,
  type BillingMethod,
} from '@/packages/admin/enum/Subscription/BillingMethodEnum';
import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import { formatCpfCnpjMask } from '@/packages/admin/helpers/BrazilDocumentMasks';
import {
  PLAN_HIGHLIGHT_CODE,
  formatDateBr,
  trialDaysLeft,
} from '@/packages/admin/helpers/SubscriptionFormat';
import { useClinicGetHook } from '@/packages/admin/hooks/Clinic/useClinicGetHook';
import { useSubscriptionCheckoutCreateHook } from '@/packages/admin/hooks/Subscription/useSubscriptionCheckoutCreateHook';
import { useSubscriptionCheckoutFormHook } from '@/packages/admin/hooks/Subscription/useSubscriptionCheckoutFormHook';
import { useSubscriptionGetHook } from '@/packages/admin/hooks/Subscription/useSubscriptionGetHook';
import { useSubscriptionPlanListHook } from '@/packages/admin/hooks/Subscription/useSubscriptionPlanListHook';
import type { SubscriptionCheckoutFormValues } from '@/packages/admin/schemas/Subscription/SubscriptionCheckoutSchema';
import type { SubscriptionCheckoutResult } from '@/packages/admin/types/Subscription/SubscriptionCheckoutTypes';
import { ApiClientError } from '@/shared/api/api-client';
import { useAuth } from '@/shared/auth/AuthProvider';
import { hasPermission } from '@/shared/auth/permissions';
import { ClivraPageHeader, ClivraSurface } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { RadioGroup } from '@/shared/ui/radio-group';
import { Skeleton } from '@/shared/ui/skeleton';
import { Spinner } from '@/shared/ui/spinner';

const POLL_MS = 4_000;

type Stage = 'choose' | 'pay';

const CTA_LABEL: Record<BillingMethod, string> = {
  PIX: 'Gerar Pix',
  BOLETO: 'Gerar boleto',
  CREDIT_CARD: 'Continuar para o pagamento seguro',
};

function SectionTitle({ step, title }: { step: number; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <span className="grid size-5 place-items-center rounded-full bg-primary text-xs text-primary-foreground">
        {step}
      </span>
      {title}
    </h2>
  );
}

export function SubscriptionCheckoutForm() {
  const { me } = useAuth();
  const canManage = hasPermission(me, 'subscription.manage');
  const plansQuery = useSubscriptionPlanListHook(canManage);
  const clinic = useClinicGetHook();
  const form = useSubscriptionCheckoutFormHook();
  const create = useSubscriptionCheckoutCreateHook();

  const [stage, setStage] = useState<Stage>('choose');
  const [result, setResult] = useState<SubscriptionCheckoutResult | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Mesma chave enquanto a escolha não muda: retentar após timeout nunca duplica a cobrança.
  const attempt = useRef<{ signature: string; key: string } | null>(null);

  const subscription = useSubscriptionGetHook(canManage, stage === 'pay' ? POLL_MS : false);

  const plans = useMemo(
    () => [...(plansQuery.data ?? [])].sort((a, b) => a.priceCents - b.priceCents),
    [plansQuery.data],
  );

  const planCode = form.watch('planCode');
  const billingMethod = form.watch('billingMethod');
  const selectedPlan = plans.find((p) => p.code === planCode) ?? null;

  useEffect(() => {
    if (planCode || plans.length === 0) return;
    const initial = plans.find((p) => p.code === PLAN_HIGHLIGHT_CODE) ?? plans[0];
    if (initial) form.setValue('planCode', initial.code);
  }, [plans, planCode, form]);

  const taxId = clinic.data?.taxId ?? null;
  useEffect(() => {
    if (taxId && !form.getValues('cpfCnpj')) {
      form.setValue('cpfCnpj', formatCpfCnpjMask(taxId));
    }
  }, [taxId, form]);

  const status = subscription.data?.status;
  const checkoutAvailable = subscription.data?.checkoutAvailable ?? true;
  const alreadyPaying = status === 'ACTIVE' || status === 'PAST_DUE';
  const trialLeft = status === 'TRIAL' ? trialDaysLeft(subscription.data?.trialEndsAt) : null;
  const firstDueLabel =
    trialLeft != null && trialLeft > 0 ? formatDateBr(subscription.data?.trialEndsAt) : 'Hoje';

  const onSubmit = async (values: SubscriptionCheckoutFormValues) => {
    setSubmitError(null);
    const signature = `${values.planCode}|${values.billingMethod}|${values.cpfCnpj}`;
    if (attempt.current?.signature !== signature) {
      attempt.current = { signature, key: crypto.randomUUID() };
    }
    try {
      const data = await create.mutateAsync({
        checkoutSchema: {
          ...values,
          cpfCnpj: values.billingMethod === 'CREDIT_CARD' ? undefined : values.cpfCnpj,
        },
        idempotencyKey: attempt.current.key,
      });
      if (data.redirectUrl) {
        setRedirecting(true);
        window.location.assign(data.redirectUrl);
        return;
      }
      setResult(data);
      setStage('pay');
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'CPF_CNPJ_REQUIRED') {
        form.setError('cpfCnpj', { message: error.message });
        return;
      }
      setSubmitError(adminErrorMessage(error));
    }
  };

  if (!canManage) {
    return (
      <div className="grid min-w-0 gap-4">
        <ClivraPageHeader title="Assinar" description="Escolha o plano e a forma de pagamento." />
        <Alert variant="destructive">
          <AlertDescription>Apenas o dono da clínica gerencia a assinatura.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (stage === 'pay' && status === 'ACTIVE') {
    return (
      <div className="grid min-w-0 gap-4" data-testid="subscription-checkout">
        <ClivraPageHeader title="Assinatura" description="Tudo certo com a sua assinatura." />
        <CheckoutSuccess planName={subscription.data?.plan.name ?? selectedPlan?.name ?? null} />
      </div>
    );
  }

  const payment = result?.payment;
  const loading = plansQuery.isLoading || subscription.isLoading;

  return (
    <div className="grid min-w-0 gap-4" data-testid="subscription-checkout">
      <ClivraPageHeader
        title={stage === 'pay' ? 'Finalize o pagamento' : 'Assinar o Clivra'}
        description={
          stage === 'pay'
            ? 'Sua assinatura ativa assim que o pagamento for confirmado.'
            : 'Escolha o plano e a forma de pagamento. Sem fidelidade — cancele quando quiser.'
        }
      />

      {!checkoutAvailable ? (
        <Alert data-testid="checkout-unavailable">
          <AlertTitle>Pagamento online indisponível</AlertTitle>
          <AlertDescription>
            Ainda não é possível assinar por aqui. Fale com o suporte do Clivra para ativar o seu
            plano.
          </AlertDescription>
        </Alert>
      ) : null}

      {alreadyPaying && stage === 'choose' ? (
        <Alert data-testid="checkout-already-active">
          <AlertTitle>
            {status === 'PAST_DUE' ? 'Há uma fatura em aberto' : 'Sua assinatura já está ativa'}
          </AlertTitle>
          <AlertDescription>
            <Link href="/app/assinatura" className="underline underline-offset-4">
              Ver minha assinatura
            </Link>
            {status === 'PAST_DUE' ? ' para pagar a fatura em aberto.' : '.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : plansQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{adminErrorMessage(plansQuery.error)}</AlertDescription>
        </Alert>
      ) : (
        <form
          className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          {stage === 'choose' ? (
            <div className="grid min-w-0 gap-5">
              <section className="grid gap-3">
                <SectionTitle step={1} title="Escolha seu plano" />
                <RadioGroup
                  className="grid-cols-1 gap-3 md:grid-cols-3"
                  value={planCode}
                  onValueChange={(value) => form.setValue('planCode', String(value))}
                  aria-label="Plano"
                >
                  {plans.map((plan) => (
                    <CheckoutPlanOption
                      key={plan.id}
                      plan={plan}
                      highlighted={plan.code === PLAN_HIGHLIGHT_CODE}
                      current={subscription.data?.plan.code === plan.code}
                      disabled={!checkoutAvailable || alreadyPaying}
                    />
                  ))}
                </RadioGroup>
              </section>

              <section className="grid gap-3">
                <SectionTitle step={2} title="Forma de pagamento" />
                <RadioGroup
                  className="grid-cols-1 gap-3 md:grid-cols-3"
                  value={billingMethod}
                  onValueChange={(value) => form.setValue('billingMethod', value as BillingMethod)}
                  aria-label="Forma de pagamento"
                >
                  {BILLING_METHODS.map((method) => (
                    <CheckoutMethodOption
                      key={method}
                      method={method}
                      recommended={method === 'PIX'}
                      disabled={!checkoutAvailable || alreadyPaying}
                    />
                  ))}
                </RadioGroup>
              </section>

              <section className="grid gap-3">
                <SectionTitle step={3} title="Dados de cobrança" />
                {billingMethod === 'CREDIT_CARD' ? (
                  <p className="text-sm text-muted-foreground" data-testid="checkout-card-note">
                    Você informa os dados do titular do cartão na página segura do Asaas, no próximo passo.
                  </p>
                ) : (
                <Field data-invalid={Boolean(form.formState.errors.cpfCnpj)} className="max-w-sm">
                  <FieldLabel htmlFor="checkout-cpf-cnpj">
                    CPF ou CNPJ do responsável pela cobrança
                  </FieldLabel>
                  <Input
                    id="checkout-cpf-cnpj"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="000.000.000-00"
                    disabled={!checkoutAvailable || alreadyPaying}
                    value={form.watch('cpfCnpj')}
                    onChange={(event) =>
                      form.setValue('cpfCnpj', formatCpfCnpjMask(event.target.value), {
                        shouldValidate: form.formState.isSubmitted,
                      })
                    }
                    aria-invalid={Boolean(form.formState.errors.cpfCnpj)}
                  />
                  <FieldDescription>Necessário para emitir a cobrança no Asaas.</FieldDescription>
                  <FieldError>{form.formState.errors.cpfCnpj?.message}</FieldError>
                </Field>
                )}

              </section>
            </div>
          ) : (
            <ClivraSurface
              className="min-w-0"
              toolbar={
                <h2 className="text-sm font-semibold text-foreground">
                  {result?.billingMethod === 'BOLETO' ? 'Pague com boleto' : 'Pague com Pix'}
                </h2>
              }
              contentClassName="px-4 py-4"
            >
              {payment?.pix ? (
                <PaymentPixPanel
                  pix={payment.pix}
                  valueCents={payment.valueCents}
                  dueDate={payment.dueDate}
                  waiting
                />
              ) : payment?.boleto ? (
                <PaymentBoletoPanel
                  boleto={payment.boleto}
                  valueCents={payment.valueCents}
                  dueDate={payment.dueDate}
                  waiting
                />
              ) : (
                <Alert data-testid="checkout-generating">
                  <AlertTitle>Estamos gerando a sua cobrança</AlertTitle>
                  <AlertDescription>
                    Em instantes ela aparece em{' '}
                    <Link href="/app/assinatura" className="underline underline-offset-4">
                      Assinatura › Faturas
                    </Link>
                    .
                  </AlertDescription>
                </Alert>
              )}
              <Button
                type="button"
                variant="ghost"
                className="mt-4 cursor-pointer"
                onClick={() => {
                  setStage('choose');
                  setResult(null);
                }}
              >
                <ArrowLeftIcon data-icon="inline-start" />
                Alterar plano ou forma de pagamento
              </Button>
            </ClivraSurface>
          )}

          <CheckoutSummary
            plan={selectedPlan}
            method={(stage === 'pay' && result?.billingMethod) || billingMethod}
            firstDueLabel={firstDueLabel}
          >
            {submitError ? (
              <Alert variant="destructive" data-testid="checkout-error">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}
            {stage === 'choose' ? (
              <Button
                type="submit"
                size="lg"
                className="w-full cursor-pointer"
                disabled={!checkoutAvailable || alreadyPaying || create.isPending || redirecting || !selectedPlan}
                data-testid="checkout-submit"
              >
                {create.isPending || redirecting ? (
                  <>
                    <Spinner />
                    {redirecting ? 'Abrindo ambiente seguro…' : 'Gerando…'}
                  </>
                ) : (
                  CTA_LABEL[billingMethod]
                )}
              </Button>
            ) : null}
          </CheckoutSummary>
        </form>
      )}
    </div>
  );
}
