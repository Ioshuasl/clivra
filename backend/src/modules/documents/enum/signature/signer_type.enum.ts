export const SIGNER_TYPES = ['PROFESSIONAL', 'PATIENT', 'GUARDIAN'] as const;

export type SignerType = (typeof SIGNER_TYPES)[number];
