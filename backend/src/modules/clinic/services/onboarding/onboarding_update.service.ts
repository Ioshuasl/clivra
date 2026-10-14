import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import { REQUIRED_ONBOARDING_STEPS } from '../../enum/onboarding/onboarding_step.enum.js';
import {
  GetOnboardingRepository,
  UpdateOnboardingRepository,
} from '../../repositories/tenant/tenant.repository.js';
import type { OnboardingUpdateSchema } from '../../schemas/clinic.schema.js';
import { GetService as OnboardingGetService } from './onboarding_get.service.js';
import type { OnboardingStatus } from '../../types/clinic.types.js';

export class UpdateService {
  constructor(
    private readonly getOnboarding = new GetOnboardingRepository(),
    private readonly updateOnboarding = new UpdateOnboardingRepository(),
    private readonly getStatus = new OnboardingGetService(),
  ) {}

  async execute(
    ctx: RequestContext,
    onboardingSchema: OnboardingUpdateSchema,
  ): Promise<OnboardingStatus> {
    if (
      (REQUIRED_ONBOARDING_STEPS as readonly string[]).includes(onboardingSchema.skipStep)
    ) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Este passo é obrigatório e não pode ser pulado. Complete a configuração.',
        400,
      );
    }

    const state = await this.getOnboarding.execute(ctx);
    if (!state) {
      throw new AppError('NOT_FOUND', 'Clínica não encontrada.', 404);
    }

    const skipped = new Set(state.onboarding.skippedSteps);
    skipped.add(onboardingSchema.skipStep);

    await this.updateOnboarding.execute(ctx, {
      skippedSteps: [...skipped],
    });

    return this.getStatus.execute(ctx);
  }
}
