import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import { SendAction } from '../../actions/message/message_send.action.js';
import { IdempotencyKeyRequiredError } from '../../models/errors/messaging.errors.js';
import type { MessageSendSchema } from '../../schemas/messaging.schema.js';
import type { InboxMessage } from '../../types/messaging.types.js';

export class SendService {
  constructor(private readonly send = new SendAction()) {}

  async execute(
    ctx: RequestContext,
    conversationId: string,
    messageSchema: MessageSendSchema,
    idempotencyKey: string | undefined,
  ): Promise<InboxMessage> {
    const key = idempotencyKey?.trim();
    if (!key) throw new IdempotencyKeyRequiredError();
    try {
      return await this.send.execute(ctx, conversationId, messageSchema, key);
    } catch (err) {
      if (err instanceof AppError) throw err;
      const message = err instanceof Error ? err.message : 'Falha ao enviar mensagem.';
      throw new AppError('PROVIDER_UNAVAILABLE', message, 503);
    }
  }
}
