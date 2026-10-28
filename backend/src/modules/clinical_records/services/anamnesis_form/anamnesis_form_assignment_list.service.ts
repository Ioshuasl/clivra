import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { ListRepository } from '../../repositories/anamnesis_form_assignment/anamnesis_form_assignment_list.repository.js';
import type { AnamnesisFormAssignmentSummary } from '../../types/anamnesis_form/anamnesis_form_assignment.types.js';

export class ListAssignmentService {
  constructor(private readonly list = new ListRepository()) {}

  async execute(ctx: RequestContext): Promise<AnamnesisFormAssignmentSummary[]> {
    return this.list.execute(ctx);
  }
}
