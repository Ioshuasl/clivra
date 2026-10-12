import type { Prisma } from '@prisma/client';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import type { ExportFormat } from '../../enum/report/export_format.enum.js';
import type { ExportableReport } from '../../enum/report/exportable_report.enum.js';
import type {
  ReportExportDto,
  ReportExportFilters,
} from '../../types/export/report_export.types.js';
import { toDto } from './mappers/report_export.mapper.js';

export type CreateExportPersist = {
  id: string;
  report: ExportableReport;
  format: ExportFormat;
  filters: ReportExportFilters;
  requestedBy: string;
};

export class CreateRepository {
  async executeInTx(
    tx: DbTransaction,
    ctx: RequestContext,
    persist: CreateExportPersist,
  ): Promise<ReportExportDto> {
    const row = await tx.reportExport.create({
      data: {
        id: persist.id,
        tenantId: ctx.tenantId,
        report: persist.report,
        format: persist.format,
        status: 'PENDING',
        filters: persist.filters as Prisma.InputJsonValue,
        requestedBy: persist.requestedBy,
      },
    });
    return toDto(row);
  }
}
