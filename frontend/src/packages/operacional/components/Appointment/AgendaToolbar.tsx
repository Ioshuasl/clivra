'use client';

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, SlidersHorizontalIcon } from 'lucide-react';
import {
  AGENDA_ALL_PROFESSIONALS,
  SLOT_MINUTES_OPTIONS,
  type SlotMinutes,
} from '@/packages/operacional/helpers/AgendaNotionTokens';
import type {
  AgendaResourceMode,
  AgendaViewMode,
  ChairOption,
  ProfessionalOption,
} from '@/packages/operacional/types/Appointment/AppointmentTypes';
import { cn } from '@/shared/helpers/utils';
import { Button } from '@/shared/ui/button';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';

type AgendaToolbarProps = {
  viewMode: AgendaViewMode;
  onViewMode: (mode: AgendaViewMode) => void;
  anchorLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  slotMinutes: SlotMinutes;
  onSlotMinutes: (value: SlotMinutes) => void;
  resourceMode: AgendaResourceMode;
  onResourceMode: (mode: AgendaResourceMode) => void;
  chairsEnabled?: boolean;
  professionals: ProfessionalOption[];
  professionalId: string;
  onProfessionalId: (id: string) => void;
  chairs: ChairOption[];
  chairId: string;
  onChairId: (id: string) => void;
  onBlock: () => void;
  blockDisabled?: boolean;
  allowAllProfessionals?: boolean;
  waitlistOpen?: boolean;
  onWaitlistToggle?: () => void;
};

const VIEW_OPTIONS: Array<{ mode: AgendaViewMode; label: string }> = [
  { mode: 'day', label: 'Dia' },
  { mode: 'week', label: 'Semana' },
  { mode: 'month', label: 'Mês' },
  { mode: 'list', label: 'Lista' },
];

export function AgendaToolbar({
  viewMode,
  onViewMode,
  anchorLabel,
  onPrev,
  onNext,
  onToday,
  slotMinutes,
  onSlotMinutes,
  resourceMode,
  onResourceMode,
  chairsEnabled = false,
  professionals,
  professionalId,
  onProfessionalId,
  chairs,
  chairId,
  onChairId,
  onBlock,
  blockDisabled = false,
  allowAllProfessionals = false,
  waitlistOpen = false,
  onWaitlistToggle,
}: AgendaToolbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const timeGrid = viewMode === 'day' || viewMode === 'week';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        aria-label="Tipo de calendário"
        value={viewMode}
        onChange={(e) => onViewMode(e.target.value as AgendaViewMode)}
        className="h-8 w-full sm:w-32"
      >
        {VIEW_OPTIONS.map((option) => (
          <NativeSelectOption key={option.mode} value={option.mode}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          className="cursor-pointer"
          aria-label="Anterior"
          onClick={onPrev}
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="cursor-pointer"
          onClick={onToday}
        >
          Hoje
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          className="cursor-pointer"
          aria-label="Próximo"
          onClick={onNext}
        >
          <ChevronRightIcon />
        </Button>
        <span className="min-w-36 px-2 text-sm font-medium text-foreground">{anchorLabel}</span>
      </div>

      {chairsEnabled ? (
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
          <Button
            type="button"
            size="sm"
            variant={resourceMode === 'professional' ? 'secondary' : 'ghost'}
            className="cursor-pointer"
            onClick={() => onResourceMode('professional')}
          >
            Profissional
          </Button>
          <Button
            type="button"
            size="sm"
            variant={resourceMode === 'chair' ? 'secondary' : 'ghost'}
            className="cursor-pointer"
            onClick={() => onResourceMode('chair')}
          >
            Cadeira
          </Button>
        </div>
      ) : null}

      {resourceMode === 'professional' || !chairsEnabled ? (
        <NativeSelect
          aria-label="Profissional"
          value={professionalId}
          onChange={(e) => onProfessionalId(e.target.value)}
          className="h-8 w-full sm:w-44"
        >
          <NativeSelectOption value="">Profissional…</NativeSelectOption>
          {allowAllProfessionals ? (
            <NativeSelectOption value={AGENDA_ALL_PROFESSIONALS}>
              Toda a equipe
            </NativeSelectOption>
          ) : null}
          {professionals.map((p) => (
            <NativeSelectOption key={p.id} value={p.id}>
              {p.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      ) : (
        <NativeSelect
          aria-label="Cadeira"
          value={chairId}
          onChange={(e) => onChairId(e.target.value)}
          className="h-8 w-full sm:w-44"
        >
          <NativeSelectOption value="">Cadeira…</NativeSelectOption>
          {chairs.map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              {c.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="cursor-pointer md:hidden"
        aria-expanded={moreOpen}
        onClick={() => setMoreOpen((open) => !open)}
      >
        <SlidersHorizontalIcon />
        Mais
      </Button>

      <div
        className={cn(
          'w-full flex-wrap items-center gap-2 md:contents',
          moreOpen ? 'flex' : 'hidden md:contents',
        )}
      >
        {timeGrid ? (
          <NativeSelect
            aria-label="Duração do slot"
            value={String(slotMinutes)}
            onChange={(e) => onSlotMinutes(Number(e.target.value) as SlotMinutes)}
            className="h-8 w-28"
          >
            {SLOT_MINUTES_OPTIONS.map((m) => (
              <NativeSelectOption key={m} value={String(m)}>
                {m} min
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : null}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="cursor-pointer"
          disabled={blockDisabled}
          title={blockDisabled ? 'Escolha um profissional para bloquear horário' : undefined}
          onClick={onBlock}
        >
          Bloquear
        </Button>
        {onWaitlistToggle ? (
          <Button
            type="button"
            size="sm"
            variant={waitlistOpen ? 'secondary' : 'outline'}
            className="cursor-pointer"
            aria-pressed={waitlistOpen}
            onClick={onWaitlistToggle}
          >
            Fila de espera
          </Button>
        ) : null}
      </div>
    </div>
  );
}
