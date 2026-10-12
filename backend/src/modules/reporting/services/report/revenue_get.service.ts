import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getPublicClinicCatalog } from '../../../clinic/clinic_public.js';
import { assertReportPeriod } from '../../helpers/period_limit.helper.js';
import { assertReportsFinancial } from '../../helpers/permissions.helper.js';
import { GetRepository } from '../../repositories/report/revenue_get.repository.js';
import type { RevenueQuerySchema } from '../../schemas/reporting.schema.js';
import type { RevenueReportDto } from '../../types/report/report.types.js';

export class GetService {
  constructor(private readonly get = new GetRepository()) {}

  async execute(
    ctx: RequestContext,
    revenueQuerySchema: RevenueQuerySchema,
  ): Promise<RevenueReportDto> {
    assertReportsFinancial(ctx);
    assertReportPeriod(revenueQuerySchema.from, revenueQuerySchema.to);

    const catalog = await getPublicClinicCatalog(ctx);
    const timezone = catalog?.timezone ?? 'America/Sao_Paulo';

    return this.get.execute(ctx, {
      from: revenueQuerySchema.from,
      to: revenueQuerySchema.to,
      timezone,
      groupBy: revenueQuerySchema.groupBy,
      unitId: revenueQuerySchema.unitId,
    });
  }
}
