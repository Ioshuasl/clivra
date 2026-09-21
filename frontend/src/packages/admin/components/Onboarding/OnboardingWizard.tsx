'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2Icon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  CopyIcon,
  ListChecksIcon,
  MessageCircleIcon,
  StethoscopeIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_DESCRIPTIONS,
  ONBOARDING_STEP_HREFS,
  ONBOARDING_STEP_LABELS,
  isOnboardingStepRequired,
  publicBookingUrl,
  type OnboardingStep,
} from '@/packages/admin/enum/OnboardingStepEnum';
import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import { useOnboardingGetHook } from '@/packages/admin/hooks/Onboarding/useOnboardingGetHook';
import { useOnboardingUpdateHook } from '@/packages/admin/hooks/Onboarding/useOnboardingUpdateHook';
import { cn } from '@/shared/helpers/utils';
import { ClivraPageHeader, ClivraSurface } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button, buttonVariants } from '@/shared/ui/button';

const STEP_ICONS: Record<OnboardingStep, LucideIcon> = {
  clinic: Building2Icon,
  hours: ClockIcon,
  professionals: StethoscopeIcon,
  procedures: ListChecksIcon,
  team: UsersIcon,
  whatsapp: MessageCircleIcon,
  firstAppointment: CalendarDaysIcon,
};

type StepView = {
  step: OnboardingStep;
  label: string;
  description: string;
  href: string;
  required: boolean;
  done: boolean;
  skipped: boolean;
  pending: boolean;
};

export function OnboardingWizard() {
  const onboardingQuery = useOnboardingGetHook();
  const skip = useOnboardingUpdateHook();
  const [copied, setCopied] = useState(false);

  const steps = useMemo((): StepView[] => {
    const status = onboardingQuery.data;
    if (!status) return [];
    return ONBOARDING_STEPS.map((step) => {
      const done = Boolean(status.stepsStatus[step]);
      const skipped = status.skippedSteps.includes(step);
      return {
        step,
        label: ONBOARDING_STEP_LABELS[step],
        description: ONBOARDING_STEP_DESCRIPTIONS[step],
        href: ONBOARDING_STEP_HREFS[step],
        required: isOnboardingStepRequired(step),
        done,
        skipped,
        pending: !done && !skipped,
      };
    });
  }, [onboardingQuery.data]);

  if (onboardingQuery.isLoading) {
    return (
      <div className="grid min-w-0 gap-4">
        <ClivraPageHeader
          title="Primeiros passos"
          description="Configure a clínica em poucos passos para começar a atender."
        />
        <ClivraSurface contentClassName="px-4 py-6">
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </ClivraSurface>
      </div>
    );
  }

  if (onboardingQuery.isError || !onboardingQuery.data) {
    return (
      <div className="grid min-w-0 gap-4">
        <ClivraPageHeader
          title="Primeiros passos"
          description="Configure a clínica em poucos passos para começar a atender."
        />
        <Alert variant="destructive">
          <AlertDescription>{adminErrorMessage(onboardingQuery.error)}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const status = onboardingQuery.data;
  const doneCount = steps.filter((item) => item.done || item.skipped).length;
  const totalCount = steps.length;
  const progressPct = Math.round((doneCount / Math.max(totalCount, 1)) * 100);
  const nextStep = steps.find((item) => item.pending);
  const bookingUrl = publicBookingUrl(status.publicBookingPath);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="grid min-w-0 gap-4">
      <ClivraPageHeader
        title="Primeiros passos"
        description="Configure a clínica em poucos passos para começar a atender."
        action={
          status.completed ? (
            <Link
              href="/app/agenda"
              className={cn(buttonVariants(), 'cursor-pointer')}
            >
              Ir para a agenda
            </Link>
          ) : null
        }
      />

      {status.completed ? (
        <ClivraSurface contentClassName="grid gap-4 px-4 py-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckIcon className="size-5" strokeWidth={2} />
            </span>
            <div className="grid min-w-0 gap-1">
              <h2 className="text-base font-semibold text-foreground">Tudo pronto para começar</h2>
              <p className="text-sm text-muted-foreground">
                Os passos obrigatórios estão concluídos. Compartilhe o link de agendamento com os
                pacientes quando quiser.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
            <code className="min-w-0 flex-1 truncate text-xs text-foreground sm:text-sm">
              {bookingUrl}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => {
                void onCopy();
              }}
            >
              <CopyIcon className="size-3.5" strokeWidth={1.8} />
              {copied ? 'Copiado' : 'Copiar link'}
            </Button>
          </div>
        </ClivraSurface>
      ) : (
        <ClivraSurface contentClassName="grid gap-3 px-4 py-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Progresso
              </p>
              <p className="mt-1 text-sm text-foreground">
                <span className="font-semibold tabular-nums">{doneCount}</span> de{' '}
                <span className="tabular-nums">{totalCount}</span> passos
              </p>
            </div>
            <p className="text-sm font-semibold tabular-nums text-primary">{progressPct}%</p>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso dos primeiros passos"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </ClivraSurface>
      )}

      {nextStep && !status.completed ? (
        <ClivraSurface
          toolbar={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Próximo passo
                </p>
                <h2 className="text-base font-semibold text-foreground">{nextStep.label}</h2>
              </div>
              {nextStep.required ? (
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  Obrigatório
                </span>
              ) : (
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  Opcional
                </span>
              )}
            </div>
          }
          contentClassName="grid gap-4 px-4 py-4"
        >
          <p className="text-sm text-muted-foreground">{nextStep.description}</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={nextStep.href}
              className={cn(buttonVariants(), 'cursor-pointer')}
            >
              Continuar
              <ChevronRightIcon className="size-4" strokeWidth={1.8} />
            </Link>
            {!nextStep.required ? (
              <Button
                type="button"
                variant="ghost"
                className="cursor-pointer"
                disabled={skip.isPending}
                onClick={() => skip.mutate({ skipStep: nextStep.step })}
              >
                Pular por agora
              </Button>
            ) : null}
          </div>
        </ClivraSurface>
      ) : null}

      <ClivraSurface
        toolbar={
          <div>
            <h2 className="text-base font-semibold text-foreground">Todos os passos</h2>
            <p className="text-xs text-muted-foreground">
              Obrigatórios liberam o uso; opcionais você faz quando quiser.
            </p>
          </div>
        }
        contentClassName="p-0"
      >
        <ul className="divide-y divide-border">
          {steps.map((item) => {
            const Icon = STEP_ICONS[item.step];
            let stateLabel = 'Pendente';
            if (item.done) stateLabel = 'Concluído';
            else if (item.skipped) stateLabel = 'Ignorado';

            return (
              <li key={item.step} className="flex flex-wrap items-start gap-3 px-4 py-3.5">
                <span
                  className={cn(
                    'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg',
                    item.done
                      ? 'bg-success/15 text-success'
                      : item.skipped
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-muted text-primary',
                  )}
                  aria-hidden
                >
                  {item.done ? (
                    <CheckIcon className="size-4" strokeWidth={2} />
                  ) : (
                    <Icon className="size-4" strokeWidth={1.7} />
                  )}
                </span>

                <div className="min-w-0 flex-1 grid gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    {item.required ? (
                      <span className="text-[11px] font-medium text-muted-foreground">
                        obrigatório
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <p
                    className={cn(
                      'text-xs font-medium',
                      item.done
                        ? 'text-success'
                        : item.skipped
                          ? 'text-muted-foreground'
                          : 'text-foreground',
                    )}
                  >
                    {stateLabel}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={item.href}
                    className={cn(
                      buttonVariants({
                        variant: item.pending ? 'outline' : 'ghost',
                        size: 'sm',
                      }),
                      'cursor-pointer',
                    )}
                  >
                    {item.done ? 'Revisar' : 'Configurar'}
                  </Link>
                  {item.pending && !item.required ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer"
                      disabled={skip.isPending}
                      onClick={() => skip.mutate({ skipStep: item.step })}
                    >
                      Pular
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </ClivraSurface>

      {skip.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{adminErrorMessage(skip.error)}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
