import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { AnamnesisFormNotFoundError } from '../../models/errors/clinical_records.errors.js';
import { ResolveRepository } from '../../repositories/anamnesis_form/anamnesis_form_resolve.repository.js';
import type { AnamnesisFormSummary } from '../../types/anamnesis_form/anamnesis_form.types.js';

export class ResolveService {
  constructor(private readonly resolve = new ResolveRepository()) {}

  async execute(ctx: RequestContext, professionalId?: string): Promise<AnamnesisFormSummary> {
    const form = await this.resolve.execute(ctx, professionalId);
    if (!form) throw new AnamnesisFormNotFoundError();
    return form;
  }
}
