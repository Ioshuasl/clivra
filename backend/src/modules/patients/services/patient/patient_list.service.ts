import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { ListPatientsRepository } from '../../repositories/patient/patient.repository.js';
import type { PatientListQuerySchema } from '../../schemas/patients.schema.js';
import type { PatientListResult } from '../../types/patients.types.js';

export class ListService {
  constructor(private readonly list = new ListPatientsRepository()) {}

  async execute(
    ctx: RequestContext,
    query: PatientListQuerySchema,
  ): Promise<PatientListResult> {
    const result = await this.list.execute(ctx, {
      search: query.search,
      cursor: query.cursor,
      limit: query.limit ?? 20,
      active: query.active === undefined ? undefined : query.active === 'true',
    });
    if ((ctx.permissions ?? []).includes('finance.read')) return result;
    return {
      ...result,
      items: result.items.map(({ hasOverdue: _hidden, ...item }) => item),
    };
  }
}
