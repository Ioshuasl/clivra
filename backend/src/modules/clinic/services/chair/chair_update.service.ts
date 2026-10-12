import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import { DuplicateNameError } from '../../models/errors/clinic.errors.js';
import {
  FindChairByNameRepository,
  GetChairRepository,
  UpdateChairRepository,
} from '../../repositories/chair/chair.repository.js';
import type { ChairUpdateSchema } from '../../schemas/clinic.schema.js';
import type { ChairSummary } from '../../types/clinic.types.js';

export class UpdateService {
  constructor(
    private readonly getChair = new GetChairRepository(),
    private readonly findByName = new FindChairByNameRepository(),
    private readonly update = new UpdateChairRepository(),
  ) {}

  async execute(
    ctx: RequestContext,
    unitId: string,
    chairId: string,
    chairSchema: ChairUpdateSchema,
  ): Promise<ChairSummary> {
    const existing = await this.getChair.execute(ctx, unitId, chairId);
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Cadeira não encontrada.', 404);
    }

    if (chairSchema.name && chairSchema.name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await this.findByName.execute(ctx, unitId, chairSchema.name, chairId);
      if (duplicate) {
        throw new DuplicateNameError('Cadeira', chairSchema.name);
      }
    }

    const updated = await this.update.execute(ctx, unitId, chairId, chairSchema);
    if (!updated) {
      throw new AppError('NOT_FOUND', 'Cadeira não encontrada.', 404);
    }
    return updated;
  }
}
