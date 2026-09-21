import type { QuoteStatus } from '@/packages/operacional/enum/Quote/QuoteStatusEnum';

export type QuoteFilterPatientOption = {
  id: string;
  code: number;
  name: string;
  socialName?: string | null;
};

export type QuoteFilterProps = {
  patientId: string;
  onPatientIdChange: (patientId: string) => void;
  onPatientSearchChange: (value: string) => void;
  patients: QuoteFilterPatientOption[];
  patientsLoading?: boolean;
  patientLabelById: (id: string) => string;
  status: QuoteStatus | '';
  onStatusChange: (value: QuoteStatus | '') => void;
};
