import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getPublicClinicCatalog } from '../../../clinic/clinic_public.js';
import { assertReportPeriod } from '../../helpers/period_limit.helper.js';
import { resolveScopedProfessionalId } from '../../helpers/permissions.helper.js';
import { GetRepository } from '../../repositories/report/procedures_get.repository.js';
import type { ProceduresQuerySchema } from '../../schemas/reporting.schema.js';
import type { ProceduresReportDto } from '../../types/report/report.types.js';

export class GetService {
  constructor(private readonly get = new GetRepository()) {}

  async execute(
    ctx: RequestContext,
    proceduresQuerySchema: ProceduresQuerySchema,
  ): Promise<ProceduresReportDto> {
    assertReportPeriod(proceduresQuerySchema.from, proceduresQuerySchema.to);

    const catalog = await getPublicClinicCatalog(ctx);
    const timezone = catalog?.timezone ?? 'America/Sao_Paulo';
    const professionalId = await resolveScopedProfessionalId(
      ctx,
      proceduresQuerySchema.professionalId,
    );

    return this.get.execute(ctx, {
      from: proceduresQuerySchema.from,
      to: proceduresQuerySchema.to,
      timezone,
      professionalId,
      unitId: proceduresQuerySchema.unitId,
    });
  }
}
