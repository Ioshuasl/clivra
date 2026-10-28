export const SIGNATURE_METHODS = ['ICP_A1', 'PATIENT_ACCEPT', 'PATIENT_WHATSAPP_CODE'] as const;

export type SignatureMethod = (typeof SIGNATURE_METHODS)[number];
