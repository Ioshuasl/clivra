import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { AuditAction, writeAuditLogSafe } from '../../../../shared/database/write_audit.js';
import { getPublicClinicCatalog } from '../../../clinic/clinic_public.js';
import { CreateAction } from '../../actions/export/report_export_create.action.js';
import type { ExportableReport } from '../../enum/report/exportable_report.enum.js';
import { todayInTimezone } from '../../helpers/civil_period.helper.js';
import { assertReportPeriod } from '../../helpers/period_limit.helper.js';
import {
  assertReportsFinancial,
  includeClinicFinancialKpis,
  resolveScopedProfessionalId,
} from '../../helpers/permissions.helper.js';
import {
  ExportPeriodRequiredError,
} from '../../models/errors/reporting.errors.js';
import type { ExportCreateBodySchema } from '../../schemas/reporting.schema.js';
import type {
  ReportExportCreateResult,
  ReportExportFilters,
} from '../../types/export/report_export.types.js';

export class CreateService {
  constructor(private readonly create = new CreateAction()) {}

  async execute(
    ctx: RequestContext,
    report: ExportableReport,
    exportCreateBodySchema: ExportCreateBodySchema,
  ): Promise<ReportExportCreateResult> {
    const catalog = await getPublicClinicCatalog(ctx);
    const timezone = catalog?.timezone ?? 'America/Sao_Paulo';
    const filters = await this.resolveFilters(ctx, report, exportCreateBodySchema, timezone);

    const result = await this.create.execute(ctx, {
      report,
      format: exportCreateBodySchema.format,
      filters,
    });

    await writeAuditLogSafe({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: AuditAction.REPORT_EXPORTED,
      resourceType: 'report_export',
      resourceId: result.exportId,
      metadata: {
        report,
        format: exportCreateBodySchema.format,
        filters,
      },
    });

    return result;
  }

  private async resolveFilters(
    ctx: RequestContext,
    report: ExportableReport,
    body: ExportCreateBodySchema,
    timezone: string,
  ): Promise<ReportExportFilters> {
    if (report === 'dashboard') {
      const professionalId = await resolveScopedProfessionalId(ctx);
      return {
        date: body.date ?? todayInTimezone(timezone),
        unitId: body.unitId,
        professionalId,
        includeReceivable: includeClinicFinancialKpis(ctx),
        timezone,
      };
    }

    if (!body.from || !body.to) throw new ExportPeriodRequiredError();
    assertReportPeriod(body.from, body.to);

    if (report === 'no-shows') {
      assertReportsFinancial(ctx);
      const professionalId = await resolveScopedProfessionalId(ctx, body.professionalId);
      return {
        from: body.from,
        to: body.to,
        unitId: body.unitId,
        professionalId,
        timezone,
      };
    }

    if (report === 'revenue') {
      assertReportsFinancial(ctx);
      return {
        from: body.from,
        to: body.to,
        unitId: body.unitId,
        groupBy: body.groupBy ?? 'day',
        timezone,
      };
    }

    // procedures
    const professionalId = await resolveScopedProfessionalId(ctx, body.professionalId);
    return {
      from: body.from,
      to: body.to,
      unitId: body.unitId,
      professionalId,
      timezone,
    };
  }
}
