'use client';

import { UserRoundIcon, UsersIcon } from 'lucide-react';
import type { BookingProfessionalOption } from '@/packages/public/types/Booking/BookingTypes';
import { BOOKING_ANY_PROFESSIONAL } from '@/packages/public/enum/Booking/BookingStepEnum';
import { cn } from '@/shared/helpers/utils';
import { Button } from '@/shared/ui/button';

type BookingStepProfessionalProps = {
  professionals: BookingProfessionalOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  onContinue: () => void;
};

export function BookingStepProfessional({
  professionals,
  selectedId,
  onSelect,
  onContinue,
}: BookingStepProfessionalProps) {
  const canContinue = Boolean(selectedId);

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-5">
      <p className="text-[13px] leading-relaxed text-muted-foreground sm:text-[14px]">
        O dentista define o atendimento na consulta. Aqui você só reserva o horário.
      </p>

      <ul className="grid gap-2.5 sm:gap-3">
        {professionals.length > 1 ? (
          <li>
            <button
              type="button"
              className={cn(
                'flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-[12px] border px-4 py-3 text-left transition-colors duration-200',
                'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                selectedId === BOOKING_ANY_PROFESSIONAL
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-foreground hover:bg-muted',
              )}
              onClick={() => onSelect(BOOKING_ANY_PROFESSIONAL)}
            >
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-[10px]',
                  selectedId === BOOKING_ANY_PROFESSIONAL
                    ? 'bg-white/15'
                    : 'bg-muted text-primary',
                )}
              >
                <UsersIcon className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold sm:text-[15px]">
                  Qualquer profissional disponível
                </span>
                <span
                  className={cn(
                    'mt-0.5 block text-[12px] sm:text-[13px]',
                    selectedId === BOOKING_ANY_PROFESSIONAL
                      ? 'text-primary-foreground/80'
                      : 'text-muted-foreground',
                  )}
                >
                  Encaixamos no primeiro horário livre
                </span>
              </span>
            </button>
          </li>
        ) : null}
        {professionals.map((professional) => {
          const selected = selectedId === professional.id;
          return (
            <li key={professional.id}>
              <button
                type="button"
                className={cn(
                  'flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-[12px] border px-4 py-3 text-left transition-colors duration-200',
                  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:bg-muted',
                )}
                onClick={() => onSelect(professional.id)}
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-[10px]',
                    selected ? 'bg-white/15' : 'bg-muted text-primary',
                  )}
                >
                  <UserRoundIcon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0 text-[14px] font-semibold sm:text-[15px]">
                  {professional.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto grid gap-2 pt-2 sm:pt-3">
        <Button
          type="button"
          size="lg"
          className="h-11 w-full cursor-pointer rounded-[10px] text-[15px] font-semibold sm:h-12"
          disabled={!canContinue}
          onClick={onContinue}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
