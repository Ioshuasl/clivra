'use client';

import { useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import {
  formatDateLongInTz,
  formatTimeInTz,
} from '@/packages/public/helpers/BookingTime';
import type { BookingAvailabilityDay } from '@/packages/public/types/Booking/BookingTypes';
import { cn } from '@/shared/helpers/utils';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

type BookingStepSlotProps = {
  timezone: string;
  days: BookingAvailabilityDay[];
  loading: boolean;
  errorMessage?: string | null;
  slotAlert?: string | null;
  suggestedSlots?: string[];
  selectedStartsAt: string;
  canGoBackRange: boolean;
  showBack?: boolean;
  onSelect: (startsAt: string) => void;
  onPrevRange: () => void;
  onNextRange: () => void;
  onRetry: () => void;
  onBack: () => void;
  onContinue: () => void;
};

function dayParts(ymd: string, timeZone: string) {
  const date = new Date(`${ymd}T12:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    weekday: 'short',
  }).format(date);
  const day = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: 'numeric',
  }).format(date);
  const month = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    month: 'short',
  }).format(date);
  return { weekday, day, month };
}

export function BookingStepSlot({
  timezone,
  days,
  loading,
  errorMessage,
  slotAlert,
  suggestedSlots = [],
  selectedStartsAt,
  canGoBackRange,
  showBack = true,
  onSelect,
  onPrevRange,
  onNextRange,
  onRetry,
  onBack,
  onContinue,
}: BookingStepSlotProps) {
  const daysWithSlots = useMemo(
    () =>
      days.map((day) => ({
        ...day,
        openSlots: day.slots.filter((slot) => slot.available),
      })),
    [days],
  );
  const [selectedDay, setSelectedDay] = useState('');
  const activeDay =
    daysWithSlots.find((day) => day.date === selectedDay) ??
    daysWithSlots.find((day) => day.openSlots.length > 0) ??
    daysWithSlots[0];
  const openSlots = activeDay?.openSlots ?? [];

  if (loading) {
    return (
      <div className="grid gap-3" aria-busy="true" aria-label="Carregando horários">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          <Skeleton className="h-16 w-16 shrink-0 rounded-[12px]" />
          <Skeleton className="h-16 w-16 shrink-0 rounded-[12px]" />
          <Skeleton className="h-16 w-16 shrink-0 rounded-[12px]" />
          <Skeleton className="h-16 w-16 shrink-0 rounded-[12px]" />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          <Skeleton className="h-11 rounded-[10px]" />
          <Skeleton className="h-11 rounded-[10px]" />
          <Skeleton className="h-11 rounded-[10px]" />
          <Skeleton className="h-11 rounded-[10px]" />
          <Skeleton className="h-11 rounded-[10px]" />
          <Skeleton className="h-11 rounded-[10px]" />
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex flex-1 flex-col gap-3">
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
        <div className="mt-auto grid gap-2">
          <Button
            type="button"
            size="lg"
            className="h-11 w-full cursor-pointer rounded-[10px] font-semibold sm:h-12"
            onClick={onRetry}
          >
            Tentar novamente
          </Button>
          {showBack ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full cursor-pointer rounded-[10px] sm:h-12"
              onClick={onBack}
            >
              Voltar
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-5">
      {slotAlert ? (
        <Alert variant="destructive">
          <AlertDescription>{slotAlert}</AlertDescription>
        </Alert>
      ) : null}

      {suggestedSlots.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-[13px] font-semibold text-foreground sm:text-[14px]">
            Horários sugeridos
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedSlots.map((iso) => (
              <Button
                key={iso}
                type="button"
                size="sm"
                variant={selectedStartsAt === iso ? 'default' : 'outline'}
                className="min-h-10 cursor-pointer rounded-[10px]"
                onClick={() => onSelect(iso)}
              >
                {formatTimeInTz(iso, timezone)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 min-w-10 cursor-pointer gap-1.5 rounded-[10px] px-3"
          disabled={!canGoBackRange}
          onClick={onPrevRange}
          aria-label="Dias anteriores"
        >
          <ChevronLeftIcon className="size-4" aria-hidden />
          <span className="hidden sm:inline">Anteriores</span>
        </Button>
        <p className="text-center text-[12px] text-muted-foreground sm:text-[13px]">
          Escolha o dia e o horário
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 min-w-10 cursor-pointer gap-1.5 rounded-[10px] px-3"
          onClick={onNextRange}
          aria-label="Próximos dias"
        >
          <span className="hidden sm:inline">Próximos</span>
          <ChevronRightIcon className="size-4" aria-hidden />
        </Button>
      </div>

      {daysWithSlots.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-border bg-muted/50 px-4 py-8 text-center">
          <p className="text-[14px] font-medium text-foreground">Sem horários neste período</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Tente os próximos dias ou escolha outro profissional.
          </p>
        </div>
      ) : (
        <>
          <div
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
            role="listbox"
            aria-label="Dias disponíveis"
          >
            {daysWithSlots.map((day) => {
              const parts = dayParts(day.date, timezone);
              const active = activeDay?.date === day.date;
              const hasSlots = day.openSlots.length > 0;
              return (
                <button
                  key={day.date}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={!hasSlots}
                  title={formatDateLongInTz(day.date, timezone)}
                  className={cn(
                    'flex h-[4.5rem] w-[4.25rem] shrink-0 cursor-pointer flex-col items-center justify-center rounded-[12px] border transition-colors duration-200',
                    'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                    'sm:h-[4.75rem] sm:w-[4.5rem]',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-muted',
                  )}
                  onClick={() => setSelectedDay(day.date)}
                >
                  <span className="text-[11px] font-medium capitalize opacity-80">
                    {parts.weekday.replace('.', '')}
                  </span>
                  <span className="text-[18px] font-semibold leading-none tabular-nums sm:text-[20px]">
                    {parts.day}
                  </span>
                  <span className="mt-0.5 text-[10px] capitalize opacity-75 sm:text-[11px]">
                    {parts.month.replace('.', '')}
                  </span>
                </button>
              );
            })}
          </div>

          {openSlots.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-border bg-muted/50 px-4 py-6 text-center">
              <p className="text-[14px] font-medium text-foreground">Nenhuma consulta neste dia</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Selecione outro dia na lista acima.
              </p>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-[13px] font-semibold text-foreground sm:text-[14px]">
                Horários livres
                <span className="ml-1.5 font-normal text-muted-foreground">
                  · {openSlots.length}
                </span>
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
                {openSlots.map((slot) => {
                  const selected = selectedStartsAt === slot.startsAt;
                  return (
                    <button
                      key={slot.startsAt}
                      type="button"
                      className={cn(
                        'flex h-11 cursor-pointer items-center justify-center rounded-[10px] border text-[14px] font-medium tabular-nums transition-colors duration-200 sm:h-12 sm:text-[15px]',
                        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-foreground hover:bg-muted',
                      )}
                      onClick={() => onSelect(slot.startsAt)}
                    >
                      {formatTimeInTz(slot.startsAt, timezone)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-auto grid gap-2 pt-2 sm:pt-3">
        <Button
          type="button"
          size="lg"
          className="h-11 w-full cursor-pointer rounded-[10px] text-[15px] font-semibold sm:h-12"
          disabled={!selectedStartsAt}
          onClick={onContinue}
        >
          Continuar
        </Button>
        {showBack ? (
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full cursor-pointer rounded-[10px] sm:h-12"
            onClick={onBack}
          >
            Voltar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
