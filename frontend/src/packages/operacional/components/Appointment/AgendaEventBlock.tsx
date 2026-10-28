'use client';

import { useRef, type PointerEvent } from 'react';
import {
  APPOINTMENT_STATUS_META,
  type AppointmentStatus,
} from '@/packages/operacional/enum/Appointment/AppointmentStatusEnum';
import { AGENDA_TOKENS } from '@/packages/operacional/helpers/AgendaNotionTokens';
import {
  formatHour,
  initials,
  minutesFromGridStart,
  parseInstant,
  snapMinutes,
} from '@/packages/operacional/helpers/AgendaTime';
import type { AppointmentSummary } from '@/packages/operacional/types/Appointment/AppointmentTypes';
import { cn } from '@/shared/helpers/utils';

type AgendaEventBlockProps = {
  appointment: AppointmentSummary;
  slotMinutes: number;
  showProfessional?: boolean;
  onOpen: (appointment: AppointmentSummary) => void;
  onMoveOrResize: (input: {
    appointmentId: string;
    startsAt: string;
    endsAt: string;
  }) => void;
};

export function AgendaEventBlock({
  appointment,
  slotMinutes,
  showProfessional = false,
  onOpen,
  onMoveOrResize,
}: AgendaEventBlockProps) {
  const status = (appointment.status in APPOINTMENT_STATUS_META
    ? appointment.status
    : 'SCHEDULED') as AppointmentStatus;
  const meta = APPOINTMENT_STATUS_META[status];
  const start = parseInstant(appointment.startsAt);
  const end = parseInstant(appointment.endsAt);
  const top = minutesFromGridStart(start) * AGENDA_TOKENS.pxPerMinute;
  const height = Math.max(
    slotMinutes * AGENDA_TOKENS.pxPerMinute,
    (end.getTime() - start.getTime()) / 60000 * AGENDA_TOKENS.pxPerMinute,
  );

  const dragRef = useRef<{
    mode: 'move' | 'resize';
    startY: number;
    origStart: Date;
    origEnd: Date;
  } | null>(null);

  const onPointerDownMove = (e: PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: 'move',
      startY: e.clientY,
      origStart: start,
      origEnd: end,
    };
  };

  const onPointerDownResize = (e: PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: 'resize',
      startY: e.clientY,
      origStart: start,
      origEnd: end,
    };
  };

  const onPointerUp = (e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const deltaPx = e.clientY - drag.startY;
    const deltaMin = snapMinutes(deltaPx / AGENDA_TOKENS.pxPerMinute, slotMinutes);
    if (deltaMin === 0) {
      onOpen(appointment);
      return;
    }
    if (drag.mode === 'move') {
      const nextStart = new Date(drag.origStart.getTime() + deltaMin * 60000);
      const nextEnd = new Date(drag.origEnd.getTime() + deltaMin * 60000);
      onMoveOrResize({
        appointmentId: appointment.id,
        startsAt: nextStart.toISOString(),
        endsAt: nextEnd.toISOString(),
      });
    } else {
      const nextEnd = new Date(drag.origEnd.getTime() + deltaMin * 60000);
      if (nextEnd <= drag.origStart) return;
      onMoveOrResize({
        appointmentId: appointment.id,
        startsAt: drag.origStart.toISOString(),
        endsAt: nextEnd.toISOString(),
      });
    }
  };

  const patientName = appointment.patient?.name ?? 'Paciente';
  const detail = appointment.procedure?.name ?? meta.label;
  const timeRange = `${formatHour(start)}–${formatHour(end)}`;
  const roomy = height >= 52;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${patientName} — ${meta.label}`}
      title={`${patientName}
${timeRange} · ${detail} · ${meta.label}`}
      className={cn(
        'absolute inset-x-1 z-10 cursor-grab overflow-hidden rounded-md border py-1 pl-2.5 pr-1.5 text-left shadow-none active:cursor-grabbing',
        meta.bg,
        meta.text,
        meta.border,
        status === 'REQUESTED' && 'border-dashed border-border',
        AGENDA_TOKENS.transition,
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
      )}
      style={{ top, height }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={onPointerDownMove}
      onPointerUp={onPointerUp}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(appointment);
        }
      }}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', meta.dot)} />
      <div className="flex items-center gap-1">
        <span
          aria-hidden
          className="flex size-4 shrink-0 items-center justify-center rounded-full bg-background/70 text-[8px] font-semibold"
        >
          {initials(patientName)}
        </span>
        <p className="truncate text-[11px] font-semibold leading-tight">{patientName}</p>
      </div>
      <p className="mt-0.5 truncate text-[10px] opacity-90">{timeRange}</p>
      {roomy ? (
        <p className="truncate text-[10px] opacity-90">
          {detail}
          {showProfessional && appointment.professional?.name
            ? ` · ${appointment.professional.name}`
            : ''}
        </p>
      ) : null}
      <button
        type="button"
        aria-label="Redimensionar duração"
        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
        onPointerDown={onPointerDownResize}
        onPointerUp={onPointerUp}
      />
    </div>
  );
}
