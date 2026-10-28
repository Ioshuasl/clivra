'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { APPOINTMENT_STATUS_META } from '@/packages/operacional/enum/Appointment/AppointmentStatusEnum';
import {
  capitalizeFirst,
  formatHour,
  parseInstant,
  toYmd,
} from '@/packages/operacional/helpers/AgendaTime';
import type { AppointmentSummary } from '@/packages/operacional/types/Appointment/AppointmentTypes';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/helpers/utils';

type AgendaListViewProps = {
  appointments: AppointmentSummary[];
  showProfessional?: boolean;
  onOpenAppointment: (appointment: AppointmentSummary) => void;
};

export function AgendaListView({
  appointments,
  showProfessional = false,
  onOpenAppointment,
}: AgendaListViewProps) {
  const sorted = [...appointments].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const groups = new Map<string, AppointmentSummary[]>();
  for (const appointment of sorted) {
    const ymd = toYmd(parseInstant(appointment.startsAt));
    groups.set(ymd, [...(groups.get(ymd) ?? []), appointment]);
  }
  const todayYmd = toYmd(new Date());

  if (groups.size === 0) {
    return (
      <div className="flex h-full min-h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Nenhuma consulta neste período.
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-auto rounded-lg border border-border bg-card">
      {[...groups.entries()].map(([ymd, items]) => (
        <section key={ymd} aria-label={ymd}>
          <h3
            className={cn(
              'sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-1.5 text-xs font-semibold backdrop-blur',
              ymd === todayYmd ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {capitalizeFirst(format(parseInstant(items[0]!.startsAt), "EEEE, d 'de' MMMM", { locale: ptBR }))}
            {ymd === todayYmd ? <Badge variant="secondary">Hoje</Badge> : null}
            <span className="ml-auto font-normal">{items.length} consulta(s)</span>
          </h3>
          <ul className="divide-y divide-border">
            {items.map((appointment) => {
              const meta =
                APPOINTMENT_STATUS_META[
                  (appointment.status in APPOINTMENT_STATUS_META
                    ? appointment.status
                    : 'SCHEDULED') as keyof typeof APPOINTMENT_STATUS_META
                ];
              const name = appointment.patient?.name ?? 'Paciente';
              return (
                <li key={appointment.id}>
                  <button
                    type="button"
                    aria-label={`${name} — ${meta.label}`}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/40"
                    onClick={() => onOpenAppointment(appointment)}
                  >
                    <span aria-hidden className={cn('h-9 w-1 shrink-0 rounded-full', meta.dot)} />
                    <span className="w-24 shrink-0 text-sm tabular-nums text-foreground">
                      {formatHour(parseInstant(appointment.startsAt))}–
                      {formatHour(parseInstant(appointment.endsAt))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {appointment.procedure?.name ?? 'Consulta'}
                        {showProfessional && appointment.professional?.name
                          ? ` · ${appointment.professional.name}`
                          : ''}
                      </span>
                    </span>
                    <Badge variant="outline" className={cn(meta.bg, meta.text, meta.border)}>
                      {meta.label}
                    </Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
