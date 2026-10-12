import type { RequestContext } from '../../../shared/domain/request_context.js';
import { logger } from '../../../shared/config/logger.js';
import type { JobPayload } from '../../../shared/queue/job_payload.js';
import { getObjectStorage, ObjectStorageError } from '../../../shared/storage/index.js';
import { buildCsv, reportExportStorageKey } from '../helpers/report_csv.helper.js';
import { GetRepository as DashboardGetRepository } from '../repositories/report/dashboard_get.repository.js';
import { GetRepository as NoShowsGetRepository } from '../repositories/report/no_shows_get.repository.js';
import { GetRepository as ProceduresGetRepository } from '../repositories/report/procedures_get.repository.js';
import { GetRepository as RevenueGetRepository } from '../repositories/report/revenue_get.repository.js';
import { GetRepository as ExportGetRepository } from '../repositories/export/report_export_get.repository.js';
import { UpdateRepository } from '../repositories/export/report_export_update.repository.js';
import type { ReportExportFilters } from '../types/export/report_export.types.js';
import type { ExportableReport } from '../enum/report/exportable_report.enum.js';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function generateExportJob(payload: JobPayload): Promise<void> {
  const exportId = typeof payload.exportId === 'string' ? payload.exportId : '';
  if (!exportId) return;

  const ctx: RequestContext = {
    tenantId: payload.tenantId,
    userId: SYSTEM_USER_ID,
    requestId: payload.requestId,
  };

  const getExport = new ExportGetRepository();
  const update = new UpdateRepository();

  const existing = await getExport.execute(ctx, exportId);
  if (!existing) return;
  if (existing.status === 'READY' && existing.storageKey) return;

  await update.execute(ctx, exportId, { status: 'RUNNING', error: null });

  try {
    const csv = await buildReportCsv(ctx, existing.report, existing.filters);
    const storageKey = reportExportStorageKey(ctx.tenantId, exportId);

    try {
      await getObjectStorage().putObject(storageKey, csv, 'text/csv; charset=utf-8');
    } catch (err) {
      if (err instanceof ObjectStorageError) {
        await update.execute(ctx, exportId, {
          status: 'FAILED',
          error: 'STORAGE_UNAVAILABLE',
          completedAt: new Date(),
        });
        logger.warn(
          { tenantId: ctx.tenantId, exportId, requestId: ctx.requestId },
          'report_export_storage_unavailable',
        );
        return;
      }
      throw err;
    }

    await update.execute(ctx, exportId, {
      status: 'READY',
      storageKey,
      error: null,
      completedAt: new Date(),
    });
    logger.info(
      { tenantId: ctx.tenantId, exportId, report: existing.report, requestId: ctx.requestId },
      'report_export_ready',
    );
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 500) : 'EXPORT_FAILED';
    await update.execute(ctx, exportId, {
      status: 'FAILED',
      error: message,
      completedAt: new Date(),
    });
    logger.error(
      { err, tenantId: ctx.tenantId, exportId, requestId: ctx.requestId },
      'report_export_failed',
    );
  }
}

async function buildReportCsv(
  ctx: RequestContext,
  report: ExportableReport,
  filters: ReportExportFilters,
): Promise<Buffer> {
  const timezone = filters.timezone ?? 'America/Sao_Paulo';

  if (report === 'dashboard') {
    const data = await new DashboardGetRepository().execute(ctx, {
      date: filters.date ?? new Date().toISOString().slice(0, 10),
      timezone,
      unitId: filters.unitId,
      professionalId: filters.professionalId,
      includeReceivable: filters.includeReceivable ?? true,
    });
    return buildCsv(
      ['metric', 'value'],
      [
        ['date', data.date],
        ['timezone', data.timezone],
        ...Object.entries(data.agendaByStatus).map(([status, count]) => [
          `agenda.${status}`,
          count,
        ]),
        ['receivableTodayCents', data.receivableTodayCents],
        ['receivableTodayCount', data.receivableTodayCount],
        ['noShowsMonthCount', data.noShowsMonthCount],
        ['productionMonthCents', data.productionMonthCents],
      ],
    );
  }

  if (report === 'no-shows') {
    const data = await new NoShowsGetRepository().execute(ctx, {
      from: filters.from!,
      to: filters.to!,
      timezone,
      professionalId: filters.professionalId,
      unitId: filters.unitId,
    });
    return buildCsv(
      [
        'appointmentId',
        'patientId',
        'patientCode',
        'professionalId',
        'professionalName',
        'procedureName',
        'status',
        'startsAt',
        'estimatedLossCents',
      ],
      data.items.map((item) => [
        item.appointmentId,
        item.patientId,
        item.patientCode,
        item.professionalId,
        item.professionalName,
        item.procedureName,
        item.status,
        item.startsAt,
        item.estimatedLossCents,
      ]),
    );
  }

  if (report === 'revenue') {
    const data = await new RevenueGetRepository().execute(ctx, {
      from: filters.from!,
      to: filters.to!,
      timezone,
      groupBy: filters.groupBy ?? 'day',
      unitId: filters.unitId,
    });
    return buildCsv(
      ['key', 'label', 'amountCents', 'count'],
      data.buckets.map((bucket) => [
        bucket.key,
        bucket.label,
        bucket.amountCents,
        bucket.count,
      ]),
    );
  }

  const data = await new ProceduresGetRepository().execute(ctx, {
    from: filters.from!,
    to: filters.to!,
    timezone,
    professionalId: filters.professionalId,
    unitId: filters.unitId,
  });
  return buildCsv(
    ['procedureId', 'procedureCode', 'procedureName', 'count', 'totalCents'],
    data.items.map((item) => [
      item.procedureId,
      item.procedureCode,
      item.procedureName,
      item.count,
      item.totalCents,
    ]),
  );
}
