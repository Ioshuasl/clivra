import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getProfessionalByMembershipId } from '../../../clinic/clinic_public.js';
import { tenantTimezone } from '../../helpers/tenant_today.helper.js';
import { ProductionScopeForbiddenError } from '../../models/errors/billing.errors.js';
import { GetRepository } from '../../repositories/report/production_get.repository.js';
import type { ProductionReportQuerySchema } from '../../schemas/billing.schema.js';
import type { ProductionReportDto } from '../../types/report/report.types.js';

export class GetService {
  constructor(private readonly get = new GetRepository()) {}

  async execute(
    ctx: RequestContext,
    productionReportQuerySchema: ProductionReportQuerySchema,
  ): Promise<ProductionReportDto> {
    let query = productionReportQuerySchema;
    if (ctx.role === 'DENTIST') {
      if (!ctx.membershipId) throw new ProductionScopeForbiddenError();
      const mine = await getProfessionalByMembershipId(ctx, ctx.membershipId);
      if (!mine) throw new ProductionScopeForbiddenError();
      if (query.professionalId && query.professionalId !== mine.id) {
        throw new ProductionScopeForbiddenError();
      }
      query = { ...query, professionalId: mine.id };
    }
    return this.get.execute(ctx, query, await tenantTimezone(ctx));
  }
}
