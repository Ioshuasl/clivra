'use client';

import { CalendarDaysIcon, CheckCircle2Icon, UserRoundIcon } from 'lucide-react';
import { formatDateTimeInTz } from '@/packages/public/helpers/BookingTime';
import { cn } from '@/shared/helpers/utils';
import { Alert, AlertDescription } from '@/shared/ui/alert';

type BookingStepSuccessProps = {
  timezone: string;
  startsAt: string;
  professionalName?: string;
  requested: boolean;
};

export function BookingStepSuccess({
  timezone,
  startsAt,
  professionalName,
  requested,
}: BookingStepSuccessProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-5">
      <div className="flex flex-col items-center text-center">
        <span
          className={cn(
            'flex size-14 items-center justify-center rounded-full sm:size-16',
            requested ? 'bg-muted text-primary' : 'bg-success/15 text-success',
          )}
        >
          <CheckCircle2Icon className="size-7 sm:size-8" strokeWidth={1.75} aria-hidden />
        </span>
        <h2 className="mt-4 text-[clamp(1.15rem,0.8vw+1rem,1.35rem)] font-semibold tracking-tight text-foreground">
          {requested ? 'Pedido enviado' : 'Horário confirmado'}
        </h2>
      </div>

      <Alert>
        <AlertDescription className="text-[13px] leading-relaxed sm:text-[14px]">
          {requested
            ? 'A clínica vai confirmar e o dentista define o atendimento. Você recebe um aviso quando o horário for aceito.'
            : 'Horário agendado com sucesso. Guarde a data e fique atento às mensagens da clínica.'}
        </AlertDescription>
      </Alert>

      <div className="rounded-[12px] border border-border bg-card px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-muted text-primary">
            <CalendarDaysIcon className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Data e horário
            </p>
            <p className="mt-0.5 text-[15px] font-semibold capitalize leading-snug text-foreground sm:text-[16px]">
              {formatDateTimeInTz(startsAt, timezone)}
            </p>
          </div>
        </div>

        <div className="my-4 h-px bg-border" aria-hidden />

        <div className="grid gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Tipo
            </p>
            <p className="mt-0.5 text-[14px] font-medium text-foreground sm:text-[15px]">
              Consulta / avaliação
            </p>
          </div>
          {professionalName ? (
            <div className="flex items-center gap-2.5">
              <UserRoundIcon className="size-4 text-primary" strokeWidth={1.75} aria-hidden />
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Profissional
                </p>
                <p className="text-[14px] font-medium text-foreground sm:text-[15px]">
                  {professionalName}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
