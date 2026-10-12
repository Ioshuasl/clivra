import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getPatientById } from '../../../patients/patients_public.js';
import { ConversationNotFoundError, InboxPatientNotFoundError } from '../../models/errors/messaging.errors.js';
import { UpdateRepository } from '../../repositories/conversation/conversation_update.repository.js';
import type { ConversationUpdateSchema } from '../../schemas/conversation.schema.js';
import type { ConversationSummary } from '../../types/conversation/conversation.types.js';

export class UpdateService {
  constructor(private readonly update = new UpdateRepository()) {}

  async execute(
    ctx: RequestContext,
    conversationId: string,
    conversationSchema: ConversationUpdateSchema,
  ): Promise<ConversationSummary> {
    if (conversationSchema.patientId) {
      const patient = await getPatientById(ctx, conversationSchema.patientId);
      if (!patient) throw new InboxPatientNotFoundError();
    }
    const conversation = await this.update.execute(ctx, conversationId, conversationSchema);
    if (!conversation) throw new ConversationNotFoundError();
    return conversation;
  }
}
