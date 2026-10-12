export const EXPORT_FORMATS = ['CSV'] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];
