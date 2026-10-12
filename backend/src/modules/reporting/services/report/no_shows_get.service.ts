import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getPublicClinicCatalog } from '../../../clinic/clinic_public.js';
import { assertReportPeriod } from '../../helpers/period_limit.helper.js';
import {
  assertReportsFinancial,
  resolveScopedProfessionalId,
} from '../../helpers/permissions.helper.js';
import { GetRepository } from '../../repositories/report/no_shows_get.repository.js';
import type { NoShowsQuerySchema } from '../../schemas/reporting.schema.js';
import type { NoShowsReportDto } from '../../types/report/report.types.js';

export class GetService {
  constructor(private readonly get = new GetRepository()) {}

  async execute(
    ctx: RequestContext,
    noShowsQuerySchema: NoShowsQuerySchema,
  ): Promise<NoShowsReportDto> {
    // Corte #11: no-shows com perda estimada exige reports.financial (dentista sem → 403).
    assertReportsFinancial(ctx);
    assertReportPeriod(noShowsQuerySchema.from, noShowsQuerySchema.to);

    const catalog = await getPublicClinicCatalog(ctx);
    const timezone = catalog?.timezone ?? 'America/Sao_Paulo';
    const professionalId = await resolveScopedProfessionalId(
      ctx,
      noShowsQuerySchema.professionalId,
    );

    return this.get.execute(ctx, {
      from: noShowsQuerySchema.from,
      to: noShowsQuerySchema.to,
      timezone,
      professionalId,
      unitId: noShowsQuerySchema.unitId,
    });
  }
}
