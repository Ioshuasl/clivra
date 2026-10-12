import type { JobPayload } from '../../../shared/queue/job_payload.js';
import { logger } from '../../../shared/config/logger.js';
import { getObjectStorage, ObjectStorageError } from '../../../shared/storage/index.js';
import { GetRepository as GetNoShowRepository } from '../repositories/no_show/no_show_get.repository.js';
import { GetRepository as GetRevenueRepository } from '../repositories/revenue/revenue_get.repository.js';
import { GetRepository as GetProcedureRepository } from '../repositories/procedure/procedure_get.repository.js';
import { GetRepository, UpdateStatusRepository } from '../repositories/export/export.repository.js';
import { resolvePeriod } from '../helpers/reporting_period.helper.js';
import { buildReportExportStorageKey } from '../helpers/report_export_storage.helper.js';
import { csvNoShows, csvProcedures, csvRevenue } from '../helpers/report_csv.helper.js';
import type { ExportReport } from '../enum/export/export.enum.js';
import type { ReportExportFilters } from '../types/export/export.types.js';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function reportExportJob(payload: JobPayload): Promise<void> {
  const exportId = typeof payload.exportId === 'string' ? payload.exportId : '';
  if (!exportId) return;

  const ctx = {
    tenantId: payload.tenantId,
    userId: SYSTEM_USER_ID,
    requestId: payload.requestId,
  };

  const getExport = new GetRepository();
  const updateStatus = new UpdateStatusRepository();
  const row = await getExport.execute(ctx, exportId);
  if (!row) return;
  if (row.status === 'READY' && row.storageKey) return;

  await updateStatus.execute(ctx, exportId, { status: 'RUNNING', error: null });

  try {
    const filters = row.filters as ReportExportFilters;
    const period = await resolvePeriod(ctx, filters);
    let csv: Buffer;

    switch (row.report as ExportReport) {
      case 'no-shows': {
        const data = await new GetNoShowRepository().execute(ctx, period, {
          professionalId: filters.professionalId,
          unitId: filters.unitId,
        });
        csv = csvNoShows(data);
        break;
      }
      case 'revenue': {
        const data = await new GetRevenueRepository().execute(
          ctx,
          period,
          filters.groupBy ?? 'day',
          { unitId: filters.unitId },
        );
        csv = csvRevenue(data);
        break;
      }
      case 'procedures': {
        const data = await new GetProcedureRepository().execute(ctx, period, {
          professionalId: filters.professionalId,
          unitId: filters.unitId,
        });
        csv = csvProcedures(data);
        break;
      }
      default:
        await updateStatus.execute(ctx, exportId, {
          status: 'FAILED',
          error: 'Relatório de exportação inválido.',
        });
        return;
    }

    const storageKey = buildReportExportStorageKey(ctx.tenantId, exportId, 'CSV');
    await getObjectStorage().putObject(storageKey, csv, 'text/csv; charset=utf-8');
    await updateStatus.execute(ctx, exportId, { status: 'READY', storageKey, error: null });
    logger.info({ tenantId: ctx.tenantId, exportId, requestId: ctx.requestId }, 'report_export_ready');
  } catch (err) {
    const message =
      err instanceof ObjectStorageError
        ? 'Armazenamento indisponível.'
        : err instanceof Error
          ? err.message
          : 'Falha ao gerar exportação.';
    await updateStatus.execute(ctx, exportId, { status: 'FAILED', error: message });
    if (!(err instanceof ObjectStorageError)) throw err;
    logger.warn({ tenantId: ctx.tenantId, exportId, requestId: ctx.requestId }, 'report_export_failed');
  }
}
