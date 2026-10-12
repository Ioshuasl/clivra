export const EXPORTABLE_REPORTS = [
  'dashboard',
  'no-shows',
  'revenue',
  'procedures',
] as const;

export type ExportableReport = (typeof EXPORTABLE_REPORTS)[number];
