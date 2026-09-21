'use client';

import type { ReactNode } from 'react';
import { CalendarDaysIcon, ShieldCheckIcon, SparklesIcon } from 'lucide-react';
import { ClivraLogo } from '@/shared/brand/ClivraLogo';
import { cn } from '@/shared/helpers/utils';
import { ThemeToggle } from '@/shared/ui/theme-toggle';

type BookingShellProps = {
  title: string;
  description?: string;
  stepLabel?: string;
  stepIndex?: number;
  stepTotal?: number;
  progress?: number;
  children: ReactNode;
};

const TRUST = [
  {
    icon: CalendarDaysIcon,
    title: 'Horário real',
    description: 'Só mostramos vagas livres na agenda da clínica.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Confirmação segura',
    description: 'Você valida com um código enviado por e-mail.',
  },
  {
    icon: SparklesIcon,
    title: 'Dentista define o atendimento',
    description: 'Aqui você reserva o horário; o procedimento fica com a clínica.',
  },
] as const;

export function BookingShell({
  title,
  description,
  stepLabel,
  stepIndex,
  stepTotal,
  progress,
  children,
}: BookingShellProps) {
  const showSteps = stepIndex != null && stepTotal != null && stepTotal > 0;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div
        className={cn(
          'mx-auto grid min-h-dvh w-full',
          'max-w-lg px-4 py-5 sm:px-6 sm:py-6',
          'md:max-w-xl md:py-8',
          'lg:max-w-5xl lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:items-stretch lg:gap-8 lg:px-8 lg:py-10',
          'xl:max-w-6xl xl:gap-10 xl:px-10',
          '[@media(max-height:820px)]:lg:py-6',
          '[@media(max-height:720px)]:py-4 [@media(max-height:720px)]:lg:py-5',
        )}
      >
        <aside
          className={cn(
            'relative hidden overflow-hidden rounded-[16px] text-white lg:flex lg:flex-col',
            'bg-primary',
            '[@media(max-height:820px)]:min-h-0',
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                'linear-gradient(160deg, #4A0F16 0%, #7A2B36 55%, #2C090F 100%)',
            }}
          />
          <div
            className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full opacity-40 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgb(168 91 103 / 0.7) 0%, transparent 70%)' }}
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 size-64 rounded-full opacity-30 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgb(122 43 54 / 0.8) 0%, transparent 70%)' }}
          />

          <div
            className={cn(
              'relative z-10 flex h-full flex-col px-8 py-8 xl:px-10 xl:py-10',
              '[@media(max-height:820px)]:px-7 [@media(max-height:820px)]:py-6',
              '[@media(max-height:720px)]:py-5',
            )}
          >
            <ClivraLogo
              size={28}
              wordmarkClassName="text-[18px] font-semibold text-white xl:text-[20px]"
            />

            <div className="mt-10 xl:mt-12 [@media(max-height:820px)]:mt-6 [@media(max-height:720px)]:mt-4">
              <p className="text-[12px] font-medium tracking-[0.12em] text-white/70 uppercase">
                Agendamento online
              </p>
              <h2 className="mt-2 font-semibold text-[clamp(1.5rem,1.2vw+1rem,2rem)] leading-tight text-white [@media(max-height:720px)]:text-[1.35rem]">
                Reserve seu horário em poucos passos
              </h2>
              <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-white/80 xl:text-[15px] [@media(max-height:720px)]:mt-2 [@media(max-height:720px)]:text-[13px]">
                Sem escolher procedimento. A clínica confirma e o dentista define o atendimento.
              </p>
            </div>

            <ul className="mt-10 grid gap-5 xl:mt-12 xl:gap-6 [@media(max-height:820px)]:mt-6 [@media(max-height:820px)]:gap-3 [@media(max-height:720px)]:mt-4">
              {TRUST.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white/10 [@media(max-height:720px)]:size-8">
                      <Icon className="size-4 text-[#F0C4CA]" strokeWidth={1.75} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold leading-snug text-white [@media(max-height:720px)]:text-[13px]">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-snug text-white/70 [@media(max-height:720px)]:text-[12px]">
                        {item.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <p className="mt-auto pt-10 text-[11px] font-medium tracking-[0.12em] text-white/65 uppercase [@media(max-height:720px)]:pt-6 [@media(max-height:700px)]:hidden">
              Tecnologia e cuidado · Clivra
            </p>
          </div>
        </aside>

        <div className="flex min-h-0 flex-col">
          <header className="mb-4 flex items-start justify-between gap-3 sm:mb-5">
            <div className="min-w-0 lg:hidden">
              <ClivraLogo
                size={24}
                wordmarkClassName="text-[16px] font-semibold text-primary"
              />
            </div>
            <div className="ml-auto shrink-0">
              <ThemeToggle />
            </div>
          </header>

          <section
            className={cn(
              'flex flex-1 flex-col rounded-[14px] border border-border bg-card',
              'px-4 py-5 shadow-none sm:px-6 sm:py-6',
              'md:px-7 md:py-7',
              'lg:px-8 lg:py-8',
            )}
          >
            <div className="mb-5 sm:mb-6">
              <div className="mb-3 h-0.5 w-9 bg-primary" aria-hidden />
              <p className="text-[12px] font-medium tracking-wide text-primary uppercase sm:text-[13px]">
                Agendar consulta
              </p>
              <h1 className="mt-1.5 text-[clamp(1.35rem,1vw+1rem,1.75rem)] font-semibold leading-tight tracking-tight text-foreground">
                {title}
              </h1>
              {description ? (
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground sm:text-[14px]">
                  {description}
                </p>
              ) : null}

              {showSteps ? (
                <div className="mt-5" aria-label={`Passo ${stepIndex} de ${stepTotal}`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[13px] font-medium text-foreground sm:text-[14px]">
                      {stepLabel ?? `Passo ${stepIndex} de ${stepTotal}`}
                    </p>
                    <p className="text-[12px] text-muted-foreground tabular-nums">
                      {stepIndex}/{stepTotal}
                    </p>
                  </div>
                  <ol className="flex gap-1.5" aria-hidden>
                    {Array.from({ length: stepTotal }, (_, i) => {
                      const n = i + 1;
                      const done = n < stepIndex!;
                      const current = n === stepIndex;
                      return (
                        <li
                          key={n}
                          className={cn(
                            'h-1.5 flex-1 rounded-full transition-colors duration-200',
                            done || current ? 'bg-primary' : 'bg-muted',
                          )}
                        />
                      );
                    })}
                  </ol>
                  {progress != null ? (
                    <span className="sr-only">Progresso {Math.round(progress)}%</span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 sm:gap-5">{children}</div>
          </section>

          <p className="mt-4 text-center text-[11px] text-muted-foreground sm:mt-5 sm:text-[12px] lg:text-left">
            Verificação segura · Feito com Clivra
          </p>
        </div>
      </div>
    </div>
  );
}
