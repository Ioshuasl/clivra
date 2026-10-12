import type { ExportFormat } from '../../enum/report/export_format.enum.js';
import type { ExportStatus } from '../../enum/report/export_status.enum.js';
import type { ExportableReport } from '../../enum/report/exportable_report.enum.js';
import type { RevenueGroupBy } from '../../enum/report/revenue_group_by.enum.js';

/** Filtros persistidos no job (já com escopo dentista resolvido). */
export type ReportExportFilters = {
  from?: string;
  to?: string;
  date?: string;
  unitId?: string;
  professionalId?: string;
  groupBy?: RevenueGroupBy;
  includeReceivable?: boolean;
  timezone?: string;
};

export type ReportExportDto = {
  id: string;
  report: ExportableReport;
  format: ExportFormat;
  status: ExportStatus;
  filters: ReportExportFilters;
  storageKey: string | null;
  requestedBy: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type ReportExportCreateResult = {
  exportId: string;
  status: ExportStatus;
};

export type ReportExportGetResult = {
  id: string;
  report: ExportableReport;
  format: ExportFormat;
  status: ExportStatus;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
  downloadExpiresInSeconds: number | null;
};
