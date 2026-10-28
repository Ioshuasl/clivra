import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getProfessionalById } from '../../../clinic/clinic_public.js';
import { AnamnesisFormNotFoundError, ProfessionalNotFoundForFormError } from '../../models/errors/clinical_records.errors.js';
import { GetActiveRepository } from '../../repositories/anamnesis_form/anamnesis_form_get_active.repository.js';
import { SetRepository } from '../../repositories/anamnesis_form_assignment/anamnesis_form_assignment_set.repository.js';
import type { AnamnesisFormAssignmentSetSchema } from '../../schemas/anamnesis_form.schema.js';

export class SetAssignmentService {
  constructor(
    private readonly getActive = new GetActiveRepository(),
    private readonly set = new SetRepository(),
  ) {}

  async execute(
    ctx: RequestContext,
    professionalId: string,
    assignmentSchema: AnamnesisFormAssignmentSetSchema,
  ): Promise<void> {
    if (!(await getProfessionalById(ctx, professionalId))) throw new ProfessionalNotFoundForFormError();
    if (assignmentSchema.formName !== null && !(await this.getActive.execute(ctx, assignmentSchema.formName))) {
      throw new AnamnesisFormNotFoundError();
    }
    await this.set.execute(ctx, professionalId, assignmentSchema.formName);
  }
}
