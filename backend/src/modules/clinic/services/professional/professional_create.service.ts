import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import {
  CreateProfessionalRepository,
  FindByMembershipRepository,
  GetMembershipRepository,
} from '../../repositories/professional/professional.repository.js';
import type { ProfessionalCreateSchema } from '../../schemas/clinic.schema.js';
import type { ProfessionalSummary } from '../../types/clinic.types.js';
import { assertCanAdd, UsageMetric } from '../../../subscription/subscription_public.js';

export class CreateService {
  constructor(
    private readonly getMembership = new GetMembershipRepository(),
    private readonly findByMembership = new FindByMembershipRepository(),
    private readonly create = new CreateProfessionalRepository(),
  ) {}

  async execute(
    ctx: RequestContext,
    professionalSchema: ProfessionalCreateSchema,
  ): Promise<ProfessionalSummary> {
    const membership = await this.getMembership.execute(ctx, professionalSchema.membershipId);
    if (!membership || !membership.active) {
      throw new AppError('NOT_FOUND', 'Membership não encontrada.', 404);
    }

    const exists = await this.findByMembership.execute(ctx, professionalSchema.membershipId);
    if (exists) {
      throw new AppError('DUPLICATE', 'Membership já possui perfil profissional.', 409);
    }

    if (membership.role === 'DENTIST') {
      if (!professionalSchema.croNumber || !professionalSchema.croState) {
        throw new AppError(
          'VALIDATION_ERROR',
          'Dentista exige CRO e UF para assinar evoluções.',
          422,
        );
      }
    }

    await assertCanAdd(ctx, UsageMetric.PROFESSIONALS);
    return this.create.execute(ctx, professionalSchema);
  }
}
