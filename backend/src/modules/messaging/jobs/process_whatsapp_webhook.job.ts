import type { JobPayload } from '../../../shared/queue/job_payload.js';
import { logger } from '../../../shared/config/logger.js';
import type { RequestContext } from '../../../shared/domain/request_context.js';
import { appendOutboxEvent } from '../../../shared/database/outbox.js';
import { getTenantPrisma } from '../../../shared/database/tenant_prisma.js';
import {
  applyCancellationFromPatient,
  applyConfirmationFromPatient,
  applyWaitlistAcceptByOfferId,
} from '../../scheduling/scheduling_public.js';
import { findPatientIdByPhone, toE164Br } from '../../patients/patients_public.js';
import { GetAccountRepository } from '../repositories/whatsapp_account/whatsapp_account.repository.js';
import { UpdateAccountRepository } from '../repositories/whatsapp_account/whatsapp_account.repository.js';
import { GetLastRelatedRepository } from '../repositories/message/message_last_related.repository.js';
import {
  UpdateConversationStatusRepository,
  UpsertConversationRepository,
} from '../repositories/conversation/conversation.repository.js';
import { IncrementUnreadRepository } from '../repositories/conversation/conversation_increment_unread.repository.js';
import { publishMessagingStreamEvent } from '../helpers/messaging_stream.helper.js';
import {
  CreateMessageRepository,
  UpdateMessageByProviderIdRepository,
} from '../repositories/message/message.repository.js';
import { parseButtonAction, parseWhatsappWebhook } from '../helpers/webhook.helper.js';

const getAccount = new GetAccountRepository();
const updateAccount = new UpdateAccountRepository();
const upsertConversation = new UpsertConversationRepository();
const incrementUnread = new IncrementUnreadRepository();
const updateConversation = new UpdateConversationStatusRepository();
const createMessage = new CreateMessageRepository();
const updateByProvider = new UpdateMessageByProviderIdRepository();
const lastRelated = new GetLastRelatedRepository();

function mapProviderStatus(status: string): string | null {
  if (status === 'sent') return 'SENT';
  if (status === 'delivered') return 'DELIVERED';
  if (status === 'read') return 'READ';
  if (status === 'failed') return 'FAILED';
  return null;
}

export async function processWhatsappWebhookJob(payload: JobPayload): Promise<void> {
  const ctx: RequestContext = {
    tenantId: payload.tenantId,
    userId: '',
    requestId: payload.requestId,
  };
  const parsed = parseWhatsappWebhook(payload.webhook);
  const account = await getAccount.execute(ctx);
  if (!account) {
    logger.warn({ tenantId: ctx.tenantId }, 'webhook_account_missing');
    return;
  }

  if (parsed.session?.status === 'WORKING' || parsed.session?.status === 'CONNECTED') {
    await updateAccount.execute(ctx, {
      status: 'CONNECTED',
      lastError: null,
      webhookVerifiedAt: new Date(),
      displayPhone: parsed.session.displayPhone,
    });
  } else if (parsed.session?.status === 'FAILED' || parsed.session?.status === 'STOPPED') {
    await updateAccount.execute(ctx, {
      status: parsed.session.status === 'STOPPED' ? 'DISCONNECTED' : 'ERROR',
      lastError: parsed.session.status,
    });
  }

  for (const status of parsed.statuses) {
    const mapped = mapProviderStatus(status.status);
    if (!mapped) continue;
    await updateByProvider.execute(ctx, status.wamid, { status: mapped });
  }

  const windowUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

  for (const inbound of parsed.inbounds) {
    const phone = toE164Br(inbound.from);
    const patientId = await findPatientIdByPhone(ctx, phone);
    const conversation = await upsertConversation.execute(ctx, {
      whatsappAccountId: account.id,
      contactPhone: phone,
      patientId,
      serviceWindowExpiresAt: windowUntil,
    });
    const created = await createMessage.execute(ctx, {
      conversationId: conversation.id,
      direction: 'INBOUND',
      type: inbound.type === 'button' || inbound.buttonText ? 'INTERACTIVE' : 'TEXT',
      body: inbound.text ?? inbound.buttonText ?? null,
      providerMessageId: inbound.wamid,
      status: 'DELIVERED',
      relatedType: null,
      relatedId: null,
    });
    if (!created.created) continue;

    await incrementUnread.execute(ctx, conversation.id);
    await publish(ctx, 'messaging.message_received', {
      conversationId: conversation.id,
      messageId: created.id,
      patientId,
    });
    publishMessagingStreamEvent(ctx.tenantId, {
      name: 'message_received',
      payload: {
        conversationId: conversation.id,
        messageId: created.id,
        patientId,
      },
    });

    const action = parseButtonAction(inbound.buttonPayload, inbound.buttonText ?? inbound.text);
    let targetId = action.targetId;
    if ((action.kind === 'CONFIRM' || action.kind === 'CANCEL') && !targetId) {
      targetId = (await lastRelated.execute(ctx, conversation.id, 'APPOINTMENT'))?.relatedId;
    }
    if (action.kind === 'WAITLIST' && !targetId) {
      targetId = (await lastRelated.execute(ctx, conversation.id, 'WAITLIST'))?.relatedId;
    }
    if (action.kind === 'CONFIRM' && targetId) {
      await applyConfirmationFromPatient(ctx, targetId);
      await publish(ctx, 'messaging.confirmation_received', {
        appointmentId: targetId,
        wamid: inbound.wamid,
      });
    } else if (action.kind === 'CANCEL' && targetId) {
      await applyCancellationFromPatient(ctx, targetId);
      await publish(ctx, 'messaging.cancellation_received', {
        appointmentId: targetId,
        wamid: inbound.wamid,
      });
    } else if (action.kind === 'WAITLIST' && targetId) {
      await applyWaitlistAcceptByOfferId(ctx, targetId);
      await publish(ctx, 'messaging.waitlist_offer_accepted', {
        offerId: targetId,
        wamid: inbound.wamid,
      });
    } else if (action.kind === 'REBOOK') {
      await updateConversation.execute(ctx, conversation.id, 'PENDING');
    }
  }
}

async function publish(
  ctx: RequestContext,
  name: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await getTenantPrisma().runInTenantContext(ctx, async (tx) => {
    await appendOutboxEvent(tx, {
      tenantId: ctx.tenantId,
      event: { name, payload: { ...payload, requestId: ctx.requestId } },
    });
  });
}
