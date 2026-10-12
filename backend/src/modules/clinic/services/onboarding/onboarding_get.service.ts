import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import {
  ONBOARDING_STEPS,
  REQUIRED_ONBOARDING_STEPS,
} from '../../enum/onboarding/onboarding_step.enum.js';
import {
  CountMembershipsRepository,
  GetOnboardingRepository,
  HasActiveProceduresRepository,
  HasActiveProfessionalsRepository,
  HasBusinessHoursRepository,
  IsProfileCompleteRepository,
} from '../../repositories/tenant/tenant.repository.js';
import type { OnboardingStatus } from '../../types/clinic.types.js';

export class GetService {
  constructor(
    private readonly getOnboarding = new GetOnboardingRepository(),
    private readonly isProfileComplete = new IsProfileCompleteRepository(),
    private readonly hasHours = new HasBusinessHoursRepository(),
    private readonly hasProfessionals = new HasActiveProfessionalsRepository(),
    private readonly hasProcedures = new HasActiveProceduresRepository(),
    private readonly countMemberships = new CountMembershipsRepository(),
  ) {}

  async execute(ctx: RequestContext): Promise<OnboardingStatus> {
    const state = await this.getOnboarding.execute(ctx);
    if (!state) {
      throw new AppError('NOT_FOUND', 'Clínica não encontrada.', 404);
    }

    const [clinicDone, hoursDone, professionalsDone, proceduresDone, memberCount] =
      await Promise.all([
        this.isProfileComplete.execute(ctx),
        this.hasHours.execute(ctx),
        this.hasProfessionals.execute(ctx),
        this.hasProcedures.execute(ctx),
        this.countMemberships.execute(ctx),
      ]);

    const stepsStatus: Record<string, boolean> = {
      clinic: clinicDone,
      hours: hoursDone,
      professionals: professionalsDone,
      procedures: proceduresDone,
      team: memberCount > 1,
      whatsapp: false,
      firstAppointment: false,
    };

    const skipped = new Set(state.onboarding.skippedSteps);
    const completed = REQUIRED_ONBOARDING_STEPS.every(
      (step) => stepsStatus[step] || skipped.has(step),
    );

    return {
      requiredSteps: REQUIRED_ONBOARDING_STEPS,
      skippedSteps: state.onboarding.skippedSteps,
      stepsStatus,
      completed,
      publicBookingPath: `/public/clinics/${state.slug}`,
    };
  }
}

export function allOnboardingStepKeys(): readonly string[] {
  return ONBOARDING_STEPS;
}
