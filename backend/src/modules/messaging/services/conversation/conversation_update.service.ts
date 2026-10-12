import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import { getPatientById } from '../../../patients/patients_public.js';
import { ConversationNotFoundError } from '../../models/errors/messaging.errors.js';
import { UpdateRepository } from '../../repositories/conversation/conversation_update.repository.js';
import type { ConversationPatchSchema } from '../../schemas/messaging.schema.js';
import type { ConversationSummary } from '../../types/messaging.types.js';

export class UpdateService {
  constructor(private readonly update = new UpdateRepository()) {}

  async execute(
    ctx: RequestContext,
    conversationId: string,
    conversationSchema: ConversationPatchSchema,
  ): Promise<ConversationSummary> {
    if (conversationSchema.patientId) {
      const patient = await getPatientById(ctx, conversationSchema.patientId);
      if (!patient) {
        throw new AppError('NOT_FOUND', 'Paciente não encontrado.', 404);
      }
    }

    const row = await this.update.execute(ctx, conversationId, conversationSchema);
    if (!row) throw new ConversationNotFoundError();
    return row;
  }
}
