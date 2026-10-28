import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { ANAMNESIS_GERAL_NAME } from '../../helpers/anamnesis_form_seed.helper.js';
import type { AnamnesisFormSummary } from '../../types/anamnesis_form/anamnesis_form.types.js';
import { GetRepository as GetAssignmentRepository } from '../anamnesis_form_assignment/anamnesis_form_assignment_get.repository.js';
import { GetActiveRepository } from './anamnesis_form_get_active.repository.js';

export class ResolveRepository {
  constructor(
    private readonly getAssignment = new GetAssignmentRepository(),
    private readonly getActive = new GetActiveRepository(),
  ) {}

  /** Modelo do profissional; sem atribuição (ou modelo inativo) cai no "Anamnese Geral" da clínica. */
  async execute(ctx: RequestContext, professionalId?: string | null): Promise<AnamnesisFormSummary | null> {
    if (professionalId) {
      const formName = await this.getAssignment.execute(ctx, professionalId);
      const assigned = formName ? await this.getActive.execute(ctx, formName) : null;
      if (assigned) return assigned;
    }
    return (await this.getActive.execute(ctx, ANAMNESIS_GERAL_NAME)) ?? this.getActive.execute(ctx);
  }
}
