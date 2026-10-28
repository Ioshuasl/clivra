export const SIGNATURE_POLICIES = ['NONE', 'OPTIONAL', 'REQUIRED'] as const;

export type SignaturePolicy = (typeof SIGNATURE_POLICIES)[number];
