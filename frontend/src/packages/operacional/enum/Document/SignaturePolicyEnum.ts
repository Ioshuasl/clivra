export const SIGNATURE_POLICIES = ['NONE', 'OPTIONAL', 'REQUIRED'] as const;

export type SignaturePolicy = (typeof SIGNATURE_POLICIES)[number];

export const SIGNATURE_POLICY_LABELS: Record<SignaturePolicy, string> = {
  NONE: 'Não precisa',
  OPTIONAL: 'Opcional',
  REQUIRED: 'Obrigatória',
};
