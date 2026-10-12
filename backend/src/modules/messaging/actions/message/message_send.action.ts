import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getMessagingProvider } from '../../../../shared/integrations/whatsapp/index.js';
import { getObjectStorage, ObjectStorageError } from '../../../../shared/storage/index.js';
import {
  findPatientIdByPhone,
  getPatientById,
} from '../../../patients/patients_public.js';
import {
  fileNameFromStorageKey,
  inboxMessageTypeFromMime,
  isInboxMediaMime,
  MEDIA_PRESIGN_TTL_SECONDS,
} from '../../helpers/media_storage.helper.js';
import {
  AccountNotConnectedError,
  AccountNotFoundError,
  ConversationNotFoundError,
  IdempotencyKeyReusedError,
  KillSwitchActiveError,
  MediaNotImplementedError,
  MediaNotUploadedError,
  StorageUnavailableError,
  UnsupportedMediaTypeError,
} from '../../models/errors/messaging.errors.js';
import { GetRepository as GetConversationRepository } from '../../repositories/conversation/conversation_get.repository.js';
import { TouchLastMessageRepository } from '../../repositories/conversation/conversation_touch_last_message.repository.js';
import { CreateMessageRepository } from '../../repositories/message/message.repository.js';
import {
  FindByIdempotencyRepository,
  GetMessageRepository,
} from '../../repositories/message/message_find_idempotency.repository.js';
import { UpdateStatusRepository } from '../../repositories/message/message_update_status.repository.js';
import { GetAccountRepository } from '../../repositories/whatsapp_account/whatsapp_account.repository.js';
import type { MessageSendSchema } from '../../schemas/messaging.schema.js';
import type { InboxMessage } from '../../types/messaging.types.js';

function samePayload(
  existing: InboxMessage,
  conversationId: string,
  body: string | null,
  mediaKey: string | null,
): boolean {
  return (
    existing.conversationId === conversationId &&
    existing.body === body &&
    existing.mediaKey === mediaKey
  );
}

export class SendAction {
  constructor(
    private readonly getAccount = new GetAccountRepository(),
    private readonly getConversation = new GetConversationRepository(),
    private readonly findIdempotency = new FindByIdempotencyRepository(),
    private readonly getMessage = new GetMessageRepository(),
    private readonly createMessage = new CreateMessageRepository(),
    private readonly updateStatus = new UpdateStatusRepository(),
    private readonly touchLast = new TouchLastMessageRepository(),
  ) {}

  async execute(
    ctx: RequestContext,
    conversationId: string,
    messageSchema: MessageSendSchema,
    idempotencyKey: string,
  ): Promise<InboxMessage> {
    const text = messageSchema.text?.trim() || null;
    const mediaKey = messageSchema.mediaStorageKey?.trim() || null;
    if (!text && !mediaKey) throw new MediaNotImplementedError();

    const existing = await this.findIdempotency.execute(ctx, idempotencyKey);
    if (existing) {
      if (!samePayload(existing, conversationId, text, mediaKey)) {
        throw new IdempotencyKeyReusedError();
      }
      return existing;
    }

    const conversation = await this.getConversation.execute(ctx, conversationId);
    if (!conversation) throw new ConversationNotFoundError();

    const account = await this.getAccount.execute(ctx);
    if (!account) throw new AccountNotFoundError();
    if (account.killSwitch) throw new KillSwitchActiveError();
    if (account.status !== 'CONNECTED') throw new AccountNotConnectedError();

    let patientId = conversation.patientId;
    if (!patientId) {
      patientId = await findPatientIdByPhone(ctx, conversation.contactPhone);
    } else {
      const patient = await getPatientById(ctx, patientId);
      if (!patient) patientId = null;
    }

    let messageType: 'TEXT' | 'IMAGE' | 'DOCUMENT' = 'TEXT';
    let mimeType: string | null = null;
    let fileUrl: string | null = null;
    let fileName: string | null = null;

    if (mediaKey) {
      if (!mediaKey.startsWith(`tenants/${ctx.tenantId}/messaging/`)) {
        throw new MediaNotUploadedError();
      }
      try {
        const head = await getObjectStorage().headObject(mediaKey);
        if (!head) throw new MediaNotUploadedError();
        mimeType = head.contentType ?? null;
        if (!mimeType || !isInboxMediaMime(mimeType)) throw new UnsupportedMediaTypeError();
        messageType = inboxMessageTypeFromMime(mimeType);
        fileName = fileNameFromStorageKey(mediaKey);
        fileUrl = (await getObjectStorage().presignGet(mediaKey, MEDIA_PRESIGN_TTL_SECONDS)).url;
      } catch (err) {
        if (
          err instanceof MediaNotUploadedError ||
          err instanceof UnsupportedMediaTypeError
        ) {
          throw err;
        }
        if (err instanceof ObjectStorageError) throw new StorageUnavailableError();
        throw err;
      }
    }

    const created = await this.createMessage.execute(ctx, {
      conversationId,
      direction: 'OUTBOUND',
      type: messageType,
      body: text,
      mediaKey,
      status: 'QUEUED',
      billable: false,
      sentBy: ctx.userId || null,
      idempotencyKey,
    });

    if (!created.created) {
      const replay = await this.findIdempotency.execute(ctx, idempotencyKey);
      if (!replay) throw new IdempotencyKeyReusedError();
      if (!samePayload(replay, conversationId, text, mediaKey)) {
        throw new IdempotencyKeyReusedError();
      }
      return replay;
    }

    try {
      const provider = getMessagingProvider();
      let sent;
      if (mediaKey && fileUrl && mimeType && fileName) {
        const mediaInput = {
          sessionName: account.sessionName,
          to: conversation.contactPhone,
          fileUrl,
          mimeType,
          fileName,
          caption: text ?? undefined,
        };
        try {
          sent =
            messageType === 'IMAGE'
              ? await provider.sendImage(mediaInput)
              : await provider.sendFile(mediaInput);
        } catch (err) {
          if (err instanceof Error && err.message === 'MEDIA_NOT_SUPPORTED') {
            throw new MediaNotImplementedError();
          }
          throw err;
        }
      } else {
        sent = await provider.sendText({
          sessionName: account.sessionName,
          to: conversation.contactPhone,
          body: text ?? '',
        });
      }

      await this.updateStatus.execute(ctx, created.id, {
        status: 'SENT',
        providerMessageId: sent.providerMessageId,
      });
      await this.touchLast.execute(ctx, conversationId, {
        patientId: patientId ?? undefined,
      });
    } catch (err) {
      if (err instanceof MediaNotImplementedError) {
        await this.updateStatus.execute(ctx, created.id, {
          status: 'FAILED',
          errorCode: 'NOT_IMPLEMENTED',
          errorMessage: err.message,
        });
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Falha ao enviar mensagem.';
      await this.updateStatus.execute(ctx, created.id, {
        status: 'FAILED',
        errorCode: 'PROVIDER_ERROR',
        errorMessage: message,
      });
      throw err;
    }

    const row = await this.getMessage.execute(ctx, created.id);
    if (!row) throw new ConversationNotFoundError();
    return row;
  }
}
