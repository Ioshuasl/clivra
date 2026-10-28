export const clinicoQueryKeys = {
  appointment: (id: string) => ['clinico-appointment', id] as const,
  patient: (id: string) => ['clinico-patient', id] as const,
  medicalRecord: (patientId: string) => ['clinico-record', patientId] as const,
  odontogramRoot: (patientId: string) => ['clinico-odontogram', patientId] as const,
  odontogram: (patientId: string, dentition: string) =>
    ['clinico-odontogram', patientId, dentition] as const,
  anamnesis: (patientId: string) => ['clinico-anamnesis', patientId] as const,
  anamnesisForm: (professionalId?: string) => ['clinico-anamnesis-form', professionalId ?? 'default'] as const,
  procedures: ['clinico-procedures'] as const,
  notes: (patientId: string) => ['clinico-notes', patientId] as const,
  attachments: (patientId: string) => ['clinico-attachments', patientId] as const,
  treatmentPlans: (patientId: string) => ['clinico-treatment-plans', patientId] as const,
  treatmentPlan: (id: string) => ['clinico-treatment-plan', id] as const,
};
