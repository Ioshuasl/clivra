export const DOCUMENT_KINDS = ['PRESCRIPTION', 'CERTIFICATE', 'CONSENT_TERM', 'CONTRACT', 'OTHER'] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** Tipos clínicos exigem permissão de prontuário; os demais, permissão de paciente. */
export const CLINICAL_DOCUMENT_KINDS: readonly DocumentKind[] = ['PRESCRIPTION', 'CERTIFICATE'];
