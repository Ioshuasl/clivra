import type { ReportExport } from '@prisma/client';
import type { ExportFormat } from '../../../enum/report/export_format.enum.js';
import type { ExportStatus } from '../../../enum/report/export_status.enum.js';
import type { ExportableReport } from '../../../enum/report/exportable_report.enum.js';
import type {
  ReportExportDto,
  ReportExportFilters,
} from '../../../types/export/report_export.types.js';

export function toDto(row: ReportExport): ReportExportDto {
  return {
    id: row.id,
    report: row.report as ExportableReport,
    format: row.format as ExportFormat,
    status: row.status as ExportStatus,
    filters: (row.filters ?? {}) as ReportExportFilters,
    storageKey: row.storageKey,
    requestedBy: row.requestedBy,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}
