import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import {
  GetProfileRepository,
  UpdateProfileRepository,
  UpdateDefaultUnitContactRepository,
} from '../../repositories/tenant/tenant.repository.js';
import type { ClinicUpdateSchema } from '../../schemas/clinic.schema.js';
import type { ClinicProfile } from '../../types/clinic.types.js';

export class UpdateService {
  constructor(
    private readonly updateProfile = new UpdateProfileRepository(),
    private readonly updateDefaultUnit = new UpdateDefaultUnitContactRepository(),
    private readonly getProfile = new GetProfileRepository(),
  ) {}

  async execute(ctx: RequestContext, clinicSchema: ClinicUpdateSchema): Promise<ClinicProfile> {
    if (ctx.role !== 'OWNER') {
      throw new AppError('FORBIDDEN', 'Somente o Owner pode alterar dados da clínica.', 403);
    }

    await this.updateProfile.execute(ctx, {
      name: clinicSchema.name,
      legalName: clinicSchema.legalName,
      taxId: clinicSchema.taxId,
      responsibleCro: clinicSchema.responsibleCro,
      timezone: clinicSchema.timezone,
      acceptedPaymentMethods: clinicSchema.acceptedPaymentMethods,
    });

    if (clinicSchema.phone !== undefined || clinicSchema.address !== undefined) {
      await this.updateDefaultUnit.execute(ctx, {
        phone: clinicSchema.phone,
        address: clinicSchema.address,
      });
    }

    const profile = await this.getProfile.execute(ctx);
    if (!profile) {
      throw new AppError('NOT_FOUND', 'Clínica não encontrada.', 404);
    }
    return profile;
  }
}
