import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getProcedureById, getProfessionalByMembershipId } from '../../../clinic/clinic_public.js';
import { getPatientById } from '../../../patients/patients_public.js';
import { isValidFdiToothCode } from '../../helpers/fdi_tooth.helper.js';
import {
  FaceRequiredError,
  InvalidToothCodeError,
  PatientRequiredError,
  ProcedureInactiveError,
  ProcedureNotFoundError,
  ToothRequiredError,
} from '../../models/errors/treatments.errors.js';
import { CreateRepository } from '../../repositories/treatment_item/treatment_item_create.repository.js';
import type { TreatmentItemCreateSchema } from '../../schemas/treatment.schema.js';

export class CreateService {
  constructor(private readonly create = new CreateRepository()) {}

  async execute(
    ctx: RequestContext,
    treatmentItemSchema: TreatmentItemCreateSchema,
  ): Promise<{ planId: string; itemId: string }> {
    const patient = await getPatientById(ctx, treatmentItemSchema.patientId);
    if (!patient) throw new PatientRequiredError();

    const procedure = await getProcedureById(ctx, treatmentItemSchema.procedureId);
    if (!procedure) throw new ProcedureNotFoundError();
    if (!procedure.active) throw new ProcedureInactiveError();

    const toothCode = treatmentItemSchema.toothCode ?? null;
    const face = treatmentItemSchema.face ?? null;
    if (procedure.requiresTooth && !toothCode) throw new ToothRequiredError();
    if (toothCode && !isValidFdiToothCode(toothCode)) throw new InvalidToothCodeError();
    if (procedure.requiresFace && !face) throw new FaceRequiredError();

    const professional = ctx.membershipId
      ? await getProfessionalByMembershipId(ctx, ctx.membershipId)
      : null;

    return this.create.execute(ctx, {
      patientId: treatmentItemSchema.patientId,
      procedureId: procedure.id,
      toothCode,
      face,
      priceCents: procedure.priceCents,
      professionalId: professional?.id ?? null,
    });
  }
}
