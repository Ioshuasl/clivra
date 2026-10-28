export const DOCUMENT_STATUSES = ['ISSUED', 'AWAITING_SIGNATURE', 'SIGNED', 'CANCELLED'] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
