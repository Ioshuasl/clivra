export const DOCUMENT_STATUSES = ['ISSUED', 'AWAITING_SIGNATURE', 'SIGNED', 'CANCELLED'] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  ISSUED: 'Emitido',
  AWAITING_SIGNATURE: 'Aguardando assinatura',
  SIGNED: 'Assinado',
  CANCELLED: 'Cancelado',
};
