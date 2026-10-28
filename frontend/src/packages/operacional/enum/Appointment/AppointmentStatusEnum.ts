export const APPOINTMENT_STATUSES = [
  'REQUESTED',
  'SCHEDULED',
  'CONFIRMED',
  'IN_SERVICE',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED',
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Badges Clivra: rótulo + tokens semânticos (nunca só cor). */
export const APPOINTMENT_STATUS_META: Record<
  AppointmentStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  REQUESTED: {
    label: 'Solicitado',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
    dot: 'bg-muted-foreground',
  },
  SCHEDULED: {
    label: 'Agendado',
    bg: 'bg-info/15',
    text: 'text-info',
    border: 'border-transparent',
    dot: 'bg-info',
  },
  CONFIRMED: {
    label: 'Confirmado',
    bg: 'bg-success/15',
    text: 'text-success',
    border: 'border-transparent',
    dot: 'bg-success',
  },
  IN_SERVICE: {
    label: 'Em atendimento',
    bg: 'bg-warning/15',
    text: 'text-warning',
    border: 'border-transparent',
    dot: 'bg-warning',
  },
  COMPLETED: {
    label: 'Concluído',
    bg: 'bg-muted',
    text: 'text-foreground',
    border: 'border-border',
    dot: 'bg-foreground',
  },
  NO_SHOW: {
    label: 'Faltou',
    bg: 'bg-destructive/15',
    text: 'text-destructive',
    border: 'border-transparent',
    dot: 'bg-destructive',
  },
  CANCELLED: {
    label: 'Cancelado',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
    dot: 'bg-muted-foreground',
  },
};

export const SERIES_DELETE_SCOPES = ['THIS', 'FUTURE', 'ALL'] as const;
export type SeriesDeleteScope = (typeof SERIES_DELETE_SCOPES)[number];
