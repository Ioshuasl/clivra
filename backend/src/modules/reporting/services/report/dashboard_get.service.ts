import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getPublicClinicCatalog } from '../../../clinic/clinic_public.js';
import {
  includeClinicFinancialKpis,
  resolveScopedProfessionalId,
} from '../../helpers/permissions.helper.js';
import { todayInTimezone } from '../../helpers/civil_period.helper.js';
import { withReportCache } from '../../helpers/report_cache.helper.js';
import { GetRepository } from '../../repositories/report/dashboard_get.repository.js';
import type { DashboardQuerySchema } from '../../schemas/reporting.schema.js';
import type { DashboardDto } from '../../types/report/report.types.js';

export class GetService {
  constructor(private readonly get = new GetRepository()) {}

  async execute(
    ctx: RequestContext,
    dashboardQuerySchema: DashboardQuerySchema,
  ): Promise<DashboardDto> {
    const catalog = await getPublicClinicCatalog(ctx);
    const timezone = catalog?.timezone ?? 'America/Sao_Paulo';
    const date = dashboardQuerySchema.date ?? todayInTimezone(timezone);
    const professionalId = await resolveScopedProfessionalId(ctx);
    const includeReceivable = includeClinicFinancialKpis(ctx);

    const cacheKey = [
      'report:dashboard',
      ctx.tenantId,
      date,
      dashboardQuerySchema.unitId ?? '-',
      professionalId ?? '-',
      includeReceivable ? '1' : '0',
    ].join(':');

    return withReportCache(cacheKey, () =>
      this.get.execute(ctx, {
        date,
        timezone,
        unitId: dashboardQuerySchema.unitId,
        professionalId,
        includeReceivable,
      }),
    );
  }
}
