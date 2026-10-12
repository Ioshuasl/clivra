import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import {
  CreateChairRepository,
  FindChairByNameRepository,
} from '../../repositories/chair/chair.repository.js';
import { GetUnitRepository } from '../../repositories/unit/unit.repository.js';
import { DuplicateNameError } from '../../models/errors/clinic.errors.js';
import type { ChairCreateSchema } from '../../schemas/clinic.schema.js';
import type { ChairSummary } from '../../types/clinic.types.js';

export class CreateService {
  constructor(
    private readonly getUnit = new GetUnitRepository(),
    private readonly findByName = new FindChairByNameRepository(),
    private readonly create = new CreateChairRepository(),
  ) {}

  async execute(
    ctx: RequestContext,
    unitId: string,
    chairSchema: ChairCreateSchema,
  ): Promise<ChairSummary> {
    const unit = await this.getUnit.execute(ctx, unitId);
    if (!unit) {
      throw new AppError('NOT_FOUND', 'Unidade não encontrada.', 404);
    }

    const duplicate = await this.findByName.execute(ctx, unitId, chairSchema.name);
    if (duplicate) {
      throw new DuplicateNameError('Cadeira', chairSchema.name);
    }

    return this.create.execute(ctx, unitId, chairSchema);
  }
}
