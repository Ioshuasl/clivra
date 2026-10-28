export type AppointmentSummary = {
  id: string;
  unitId: string;
  patientId: string;
  professionalId: string;
  chairId: string | null;
  procedureId: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  origin: string;
  notes: string | null;
  cancelReason: string | null;
  recurrenceId: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: { id: string; name: string; phonePrimary: string };
  professional?: { id: string; name: string };
  procedure?: { id: string; name: string; defaultMinutes: number } | null;
};

export type AppointmentListQuery = {
  unitId?: string;
  professionalId?: string;
  chairId?: string;
  patientId?: string;
  status?: string;
  from?: string;
  to?: string;
};

export type AppointmentCreateInput = {
  unitId?: string;
  patientId: string;
  professionalId: string;
  chairId?: string | null;
  procedureId?: string | null;
  startsAt: string;
  endsAt?: string;
  notes?: string | null;
};

export type AppointmentUpdateInput = {
  professionalId?: string;
  chairId?: string | null;
  procedureId?: string | null;
  startsAt?: string;
  endsAt?: string;
  notes?: string | null;
};

export type AppointmentStatusInput = {
  status: string;
  reason?: string | null;
};

export type ScheduleBlockSummary = {
  id: string;
  unitId: string;
  professionalId: string | null;
  chairId: string | null;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdAt: string;
  conflicts: Array<{ appointmentId: string; startsAt: string; endsAt: string }>;
};

export type ScheduleBlockCreateInput = {
  unitId?: string;
  professionalId?: string | null;
  chairId?: string | null;
  startsAt: string;
  endsAt: string;
  reason: string;
};

export type AppointmentSeriesSummary = {
  id: string;
  unitId: string;
  patientId: string;
  professionalId: string;
  rrule: string;
  startsAt: string;
  durationMinutes: number;
  appointments: AppointmentSummary[];
};

export type AppointmentSeriesCreateInput = {
  unitId?: string;
  patientId: string;
  professionalId: string;
  chairId?: string | null;
  procedureId?: string | null;
  rrule: string;
  startsAt: string;
  durationMinutes?: number;
  notes?: string | null;
};

export type ProfessionalOption = {
  id: string;
  name: string;
  color: string | null;
  active: boolean;
};

export type ChairOption = {
  id: string;
  name: string;
  color: string | null;
  active: boolean;
};

export type AgendaViewMode = 'day' | 'week' | 'month' | 'list';

export type AgendaColumn = {
  key: string;
  label: string;
  day: Date;
  professionalId?: string;
  color?: string | null;
};

export type AgendaResourceMode = 'professional' | 'chair';
