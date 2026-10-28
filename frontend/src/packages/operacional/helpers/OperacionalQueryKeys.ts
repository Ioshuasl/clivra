export const operacionalQueryKeys = {
  patients: (search?: string, page?: number, active?: string) =>
    ['patients', search ?? '', page ?? 1, active ?? 'all'] as const,
  patient: (id: string) => ['patient', id] as const,
  patientTimeline: (id: string) => ['patient-timeline', id] as const,
  patientConsents: (id: string) => ['patient-consents', id] as const,
  appointments: (resourceKey: string, from: string, to: string) =>
    ['appointments', resourceKey, from, to] as const,
  agendaProfessionals: ['agenda-professionals'] as const,
  agendaChairs: ['agenda-chairs'] as const,
  agendaClinicSettings: ['agenda-clinic-settings'] as const,
  waitlist: (professionalId?: string) => ['waitlist', professionalId ?? ''] as const,
  procedures: ['procedures'] as const,
  medicalRecord: (patientId: string) => ['medical-record', patientId] as const,
  anamnesis: (patientId: string) => ['anamnesis', patientId] as const,
  quotes: (patientId?: string, status?: string) =>
    ['quotes', patientId ?? '', status ?? ''] as const,
  quote: (id: string) => ['quote', id] as const,
  patientFinance: (patientId: string) => ['patient-finance', patientId] as const,
  patientCredit: (patientId: string) => ['patient-credit', patientId] as const,
  documentTemplates: ['document-templates'] as const,
  documentCertificate: ['document-certificate'] as const,
  documentSetting: ['document-setting'] as const,
  patientDocuments: (patientId: string) => ['patient-documents', patientId] as const,
};
