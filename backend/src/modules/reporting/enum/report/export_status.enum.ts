export const EXPORT_STATUSES = ['PENDING', 'RUNNING', 'READY', 'FAILED'] as const;

export type ExportStatus = (typeof EXPORT_STATUSES)[number];
