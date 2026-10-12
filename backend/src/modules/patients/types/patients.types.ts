export type PatientAddress = {
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

export type PatientWarning = 'MINOR_WITHOUT_GUARDIAN' | 'POSSIBLE_PHONE_DUPLICATE';

export type PatientSummary = {
  id: string;
  unitId: string;
  code: number;
  name: string;
  socialName: string | null;
  cpf: string | null;
  birthDate: string | null;
  sex: string | null;
  phonePrimary: string;
  phoneSecondary: string | null;
  email: string | null;
  address: PatientAddress | null;
  howFoundUs: string | null;
  notes: string | null;
  origin: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  hasOverdue?: boolean;
};

export type PatientDetail = PatientSummary & {
  guardians: LegalGuardianSummary[];
  consents: ConsentSummary[];
  warnings: PatientWarning[];
};

export type LegalGuardianSummary = {
  id: string;
  patientId: string;
  name: string;
  cpf: string | null;
  relationship: string | null;
  phone: string | null;
  email: string | null;
};

export type ConsentSummary = {
  id: string;
  patientId: string;
  type: string;
  granted: boolean;
  documentVersion: string;
  channel: string;
  grantedAt: string;
  revokedAt: string | null;
};

export type PatientDuplicateMatch = {
  id: string;
  code: number;
  name: string;
  phonePrimary: string;
  cpf: string | null;
};

export type CheckDuplicateResult = {
  cpfMatch: PatientDuplicateMatch | null;
  phoneMatches: PatientDuplicateMatch[];
};

export type PatientCreateResult = {
  patient: PatientDetail;
  warnings: PatientWarning[];
};

export type PatientListResult = {
  items: PatientSummary[];
  nextCursor: string | null;
};

export type TimelineSource =
  | 'APPOINTMENT'
  | 'CLINICAL'
  | 'QUOTE'
  | 'PAYMENT'
  | 'MESSAGE';

export type TimelineItem = {
  id: string;
  source: TimelineSource;
  occurredAt: string;
  title: string;
  summary: string | null;
  refId: string;
  meta?: Record<string, unknown>;
};

export type PatientTimelineResult = {
  items: TimelineItem[];
  /** Fontes incluídas conforme permissões (RF-E3-09/10). */
  includedSources: TimelineSource[];
  nextCursor: string | null;
};
