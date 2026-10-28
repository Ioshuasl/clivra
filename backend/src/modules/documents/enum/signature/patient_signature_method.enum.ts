/** Como a clínica colhe a assinatura do paciente. */
export const PATIENT_SIGNATURE_METHODS = ['ACCEPT', 'WHATSAPP_CODE'] as const;

export type PatientSignatureMethod = (typeof PATIENT_SIGNATURE_METHODS)[number];

export const DEFAULT_PATIENT_SIGNATURE_METHOD: PatientSignatureMethod = 'ACCEPT';
