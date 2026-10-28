'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { AgendaEventBlock } from '@/packages/operacional/components/Appointment/AgendaEventBlock';
import {
  AGENDA_TOKENS,
  type SlotMinutes,
} from '@/packages/operacional/helpers/AgendaNotionTokens';
import {
  buildSlotStart,
  dayLabel,
  formatHour,
  gridHeightPx,
  hoursAxis,
  minutesFromGridStart,
  offsetPxInGrid,
  parseInstant,
  snapMinutes,
  toYmd,
  weekdayShort,
} from '@/packages/operacional/helpers/AgendaTime';
import type {
  AgendaColumn,
  AppointmentSummary,
} from '@/packages/operacional/types/Appointment/AppointmentTypes';
import { cn } from '@/shared/helpers/utils';

type AgendaGridProps = {
  columns: AgendaColumn[];
  appointments: AppointmentSummary[];
  slotMinutes: SlotMinutes;
  /** Muda quando a visão/dia muda: reposiciona a rolagem. */
  scrollKey: string;
  showProfessional?: boolean;
  className?: string;
  onSlotClick: (startsAt: Date, endsAt: Date, professionalId?: string) => void;
  onOpenAppointment: (appointment: AppointmentSummary) => void;
  onMoveOrResize: (input: {
    appointmentId: string;
    startsAt: string;
    endsAt: string;
  }) => void;
};

const HOUR_PX = 60 * AGENDA_TOKENS.pxPerMinute;
const TIME_COL_PX = 56;

function isSameDay(a: Date, b: Date): boolean {
  return toYmd(a) === toYmd(b);
}

export function AgendaGrid({
  columns,
  appointments,
  slotMinutes,
  scrollKey,
  showProfessional = false,
  className,
  onSlotClick,
  onOpenAppointment,
  onMoveOrResize,
}: AgendaGridProps) {
  const height = gridHeightPx();
  const hours = hoursAxis();
  const [now, setNow] = useState(() => new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTargetRef = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Alvo da rolagem: hora atual (se a coluna de hoje está visível), senão o 1º atendimento, senão 08:00.
  const nowOffset = offsetPxInGrid(now);
  const showsToday = columns.some((c) => isSameDay(c.day, now));
  const firstEventTop = appointments.reduce<number | null>((min, a) => {
    const top = minutesFromGridStart(parseInstant(a.startsAt)) * AGENDA_TOKENS.pxPerMinute;
    return min === null || top < min ? top : min;
  }, null);
  const anchorTop =
    showsToday && nowOffset !== null ? nowOffset : (firstEventTop ?? HOUR_PX);
  const scrollTarget = Math.max(0, anchorTop - HOUR_PX);

  useEffect(() => {
    scrollTargetRef.current = scrollTarget;
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollTargetRef.current });
  }, [scrollKey]);

  const onColumnClick = (column: AgendaColumn, e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawMinutes = y / AGENDA_TOKENS.pxPerMinute;
    const snapped = snapMinutes(rawMinutes, slotMinutes);
    const startsAt = buildSlotStart(column.day, snapped);
    const endsAt = new Date(startsAt.getTime() + slotMinutes * 60000);
    onSlotClick(startsAt, endsAt, column.professionalId);
  };

  const minColumn = columns.some((c) => c.professionalId) ? 160 : 130;

  return (
    <div
      ref={scrollRef}
      className={cn(
        'h-full min-h-0 overflow-auto rounded-lg border border-border',
        AGENDA_TOKENS.gridBg,
        className,
      )}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `${TIME_COL_PX}px repeat(${columns.length}, minmax(${minColumn}px, 1fr))`,
          minWidth: `${TIME_COL_PX + columns.length * minColumn}px`,
        }}
      >
        <div className={cn('sticky top-0 z-20 border-b', AGENDA_TOKENS.dayHeader)} />
        {columns.map((column) => {
          const todayCol = isSameDay(column.day, now);
          return (
            <div
              key={column.key}
              className={cn(
                'sticky top-0 z-20 flex items-center justify-center gap-1.5 border-b border-l px-2 py-1.5 text-xs font-medium',
                AGENDA_TOKENS.dayHeader,
                todayCol && !column.professionalId
                  ? AGENDA_TOKENS.dayHeaderToday
                  : 'text-muted-foreground',
              )}
            >
              {column.professionalId ? (
                <>
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full bg-primary"
                    style={column.color ? { backgroundColor: column.color } : undefined}
                  />
                  <span className="truncate text-foreground">{column.label}</span>
                </>
              ) : (
                <>
                  <span className="uppercase tracking-wide">{weekdayShort(column.day)}</span>
                  <span
                    className={cn(
                      'flex size-6 items-center justify-center rounded-full text-sm font-semibold',
                      todayCol
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground',
                    )}
                  >
                    {column.day.getDate()}
                  </span>
                </>
              )}
            </div>
          );
        })}

        <div className="relative border-r border-border" style={{ height }}>
          {hours.map((hour, index) => {
            const top =
              (hour.getHours() - AGENDA_TOKENS.dayStartHour) * 60 * AGENDA_TOKENS.pxPerMinute;
            return (
              <div
                key={hour.toISOString()}
                className={cn(
                  'absolute right-1 text-[10px] text-muted-foreground',
                  index === 0 ? 'translate-y-0.5' : '-translate-y-1/2',
                )}
                style={{ top }}
              >
                {formatHour(hour)}
              </div>
            );
          })}
        </div>

        {columns.map((column) => {
          const ymd = toYmd(column.day);
          const todayCol = isSameDay(column.day, now);
          const columnEvents = appointments.filter(
            (a) =>
              toYmd(parseInstant(a.startsAt)) === ymd &&
              (!column.professionalId || a.professionalId === column.professionalId),
          );
          return (
            <div
              key={column.key}
              className={cn(
                'relative border-l border-border',
                AGENDA_TOKENS.slotHover,
                AGENDA_TOKENS.transition,
                todayCol && AGENDA_TOKENS.slotToday,
              )}
              style={{ height }}
              onClick={(e) => onColumnClick(column, e)}
              role="gridcell"
              aria-label={`Agenda ${column.professionalId ? column.label : dayLabel(column.day)}`}
            >
              {hours.map((hour) => {
                const top =
                  (hour.getHours() - AGENDA_TOKENS.dayStartHour) *
                  60 *
                  AGENDA_TOKENS.pxPerMinute;
                return (
                  <div
                    key={`${column.key}-${hour.getHours()}`}
                    className={cn(
                      'pointer-events-none absolute inset-x-0 border-t',
                      AGENDA_TOKENS.hourLine,
                    )}
                    style={{ top }}
                  />
                );
              })}
              {todayCol && nowOffset !== null ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                  style={{ top: nowOffset }}
                >
                  <span className={cn('-ml-1 size-2 rounded-full', AGENDA_TOKENS.nowLine)} />
                  <span className={cn('h-px flex-1', AGENDA_TOKENS.nowLine)} />
                </div>
              ) : null}
              {columnEvents.map((appointment) => (
                <AgendaEventBlock
                  key={appointment.id}
                  appointment={appointment}
                  slotMinutes={slotMinutes}
                  showProfessional={showProfessional}
                  onOpen={onOpenAppointment}
                  onMoveOrResize={onMoveOrResize}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
