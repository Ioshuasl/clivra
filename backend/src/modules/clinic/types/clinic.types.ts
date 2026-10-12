export type ClinicAddress = {
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

export type ClinicProfile = {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  taxId: string | null;
  responsibleCro: string | null;
  timezone: string;
  acceptedPaymentMethods: string[];
  defaultUnit: {
    id: string;
    name: string;
    phone: string | null;
    address: ClinicAddress | null;
  } | null;
};

export type UnitSummary = {
  id: string;
  name: string;
  isDefault: boolean;
  phone: string | null;
  address: ClinicAddress | null;
};

export type ChairSummary = {
  id: string;
  unitId: string;
  name: string;
  color: string | null;
  active: boolean;
};

export type BusinessHoursSlot = {
  id: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
};

/** Conflito de agenda ao criar exceção (RF-E2-06). */
export type ScheduleConflictSummary = {
  appointmentId: string;
  startsAt: string;
  endsAt: string;
};

export type BusinessHoursExceptionSummary = {
  id: string;
  unitId: string;
  professionalId: string | null;
  date: string;
  closed: boolean;
  startsAt: string | null;
  endsAt: string | null;
  reason: string | null;
  /** Agendamentos afetados; exceção não cancela automaticamente. */
  conflicts: ScheduleConflictSummary[];
};

export type ProfessionalSummary = {
  id: string;
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  croNumber: string | null;
  croState: string | null;
  specialties: string[];
  color: string | null;
  active: boolean;
};

export type ProcedureSummary = {
  id: string;
  code: string;
  name: string;
  specialty: string | null;
  defaultMinutes: number;
  priceCents: number;
  requiresTooth: boolean;
  requiresFace: boolean;
  active: boolean;
};

export type OnboardingState = {
  skippedSteps: string[];
};

export type OnboardingStatus = {
  requiredSteps: readonly string[];
  skippedSteps: string[];
  stepsStatus: Record<string, boolean>;
  completed: boolean;
  publicBookingPath: string;
};

export type ImportCatalogResult = {
  imported: number;
  skipped: number;
};
