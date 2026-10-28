'use client';

import { APPOINTMENT_STATUS_META } from '@/packages/operacional/enum/Appointment/AppointmentStatusEnum';
import {
  formatHour,
  parseInstant,
  toYmd,
  weekdayShort,
} from '@/packages/operacional/helpers/AgendaTime';
import type { AppointmentSummary } from '@/packages/operacional/types/Appointment/AppointmentTypes';
import { cn } from '@/shared/helpers/utils';

type AgendaMonthGridProps = {
  days: Date[];
  anchor: Date;
  appointments: AppointmentSummary[];
  showProfessional?: boolean;
  onOpenDay: (day: Date) => void;
  onOpenAppointment: (appointment: AppointmentSummary) => void;
};

const MAX_CHIPS = 3;

function statusMeta(status: string) {
  return APPOINTMENT_STATUS_META[
    (status in APPOINTMENT_STATUS_META ? status : 'SCHEDULED') as keyof typeof APPOINTMENT_STATUS_META
  ];
}

export function AgendaMonthGrid({
  days,
  anchor,
  appointments,
  showProfessional = false,
  onOpenDay,
  onOpenAppointment,
}: AgendaMonthGridProps) {
  const todayYmd = toYmd(new Date());
  const byDay = new Map<string, AppointmentSummary[]>();
  for (const appointment of appointments) {
    const ymd = toYmd(parseInstant(appointment.startsAt));
    byDay.set(ymd, [...(byDay.get(ymd) ?? []), appointment]);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto rounded-lg border border-border bg-card">
      <div className="sticky top-0 z-10 grid grid-cols-[repeat(7,minmax(0,1fr))] border-b border-border bg-card">
        {days.slice(0, 7).map((day) => (
          <div
            key={day.getDay()}
            className="px-1 py-1.5 text-center text-[11px] font-medium uppercase sm:text-xs sm:tracking-wide text-muted-foreground"
          >
            {weekdayShort(day).slice(0, 3)}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-[repeat(7,minmax(0,1fr))] auto-rows-fr">
        {days.map((day) => {
          const ymd = toYmd(day);
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = ymd === todayYmd;
          const events = (byDay.get(ymd) ?? []).sort((a, b) =>
            a.startsAt.localeCompare(b.startsAt),
          );
          const extra = events.length - MAX_CHIPS;
          return (
            <div
              key={ymd}
              role="gridcell"
              aria-label={`${day.getDate()} — ${events.length} consulta(s)`}
              className={cn(
                'flex min-h-24 cursor-pointer flex-col gap-0.5 border-b border-l border-border p-1 hover:bg-muted/40',
                !inMonth && 'bg-muted/20',
              )}
              onClick={() => onOpenDay(day)}
            >
              <span
                className={cn(
                  'ml-auto flex size-6 items-center justify-center rounded-full text-xs font-medium',
                  isToday
                    ? 'bg-primary text-primary-foreground'
                    : inMonth
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                )}
              >
                {day.getDate()}
              </span>

              <div className="hidden flex-col gap-0.5 sm:flex">
                {events.slice(0, MAX_CHIPS).map((appointment) => {
                  const meta = statusMeta(appointment.status);
                  const name = appointment.patient?.name ?? 'Paciente';
                  return (
                    <button
                      key={appointment.id}
                      type="button"
                      title={`${name} — ${meta.label}`}
                      aria-label={`${name} — ${meta.label}`}
                      className={cn(
                        'flex min-w-0 cursor-pointer items-center gap-1 rounded border px-1 py-0.5 text-left text-[10px] leading-tight',
                        meta.bg,
                        meta.text,
                        meta.border,
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAppointment(appointment);
                      }}
                    >
                      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', meta.dot)} />
                      <span className="shrink-0 font-medium">
                        {formatHour(parseInstant(appointment.startsAt))}
                      </span>
                      <span className="truncate">
                        {name}
                        {showProfessional && appointment.professional?.name
                          ? ` · ${appointment.professional.name.split(' ')[0]}`
                          : ''}
                      </span>
                    </button>
                  );
                })}
                {extra > 0 ? (
                  <span className="px-1 text-[10px] font-medium text-muted-foreground">
                    +{extra} mais
                  </span>
                ) : null}
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-0.5 sm:hidden" aria-hidden>
                {events.slice(0, 4).map((appointment) => (
                  <span
                    key={appointment.id}
                    className={cn('size-1.5 rounded-full', statusMeta(appointment.status).dot)}
                  />
                ))}
                {events.length > 4 ? (
                  <span className="text-[9px] text-muted-foreground">+{events.length - 4}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
