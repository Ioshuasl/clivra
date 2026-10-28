export const DOCUMENT_KINDS = ['PRESCRIPTION', 'CERTIFICATE', 'CONSENT_TERM', 'CONTRACT', 'OTHER'] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  PRESCRIPTION: 'Receita',
  CERTIFICATE: 'Atestado',
  CONSENT_TERM: 'Termo de consentimento',
  CONTRACT: 'Contrato',
  OTHER: 'Outro documento',
};
