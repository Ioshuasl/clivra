import type { JobPayload } from '../../../shared/queue/job_payload.js';
import { logger } from '../../../shared/config/logger.js';
import type { RequestContext } from '../../../shared/domain/request_context.js';
import { getMessagingProvider } from '../../../shared/integrations/whatsapp/index.js';
import { getAppointmentById } from '../../scheduling/scheduling_public.js';
import { getPatientById, hasMarketingConsent } from '../../patients/patients_public.js';
import { toE164Br } from '../../patients/patients_public.js';
import {
  GetAutomationRunRepository,
  MarkAutomationRunRepository,
} from '../repositories/automation/automation.repository.js';
import { GetAccountRepository } from '../repositories/whatsapp_account/whatsapp_account.repository.js';
import { GetTemplateByKeyRepository } from '../repositories/template/template.repository.js';
import { GetTenantMessagingContextRepository } from '../repositories/credit/credit.repository.js';
import { UpsertConversationRepository } from '../repositories/conversation/conversation.repository.js';
import { CreateMessageRepository } from '../repositories/message/message.repository.js';
import { renderTemplateBody } from '../helpers/template.helper.js';
import { formatHmInTz, formatYmdInTz } from '../helpers/quiet_hours.helper.js';
import type { ReplyButton } from '../types/ports/messaging_provider.port.js';

const getAccount = new GetAccountRepository();
const getTemplate = new GetTemplateByKeyRepository();
const getRun = new GetAutomationRunRepository();
const markRun = new MarkAutomationRunRepository();
const tenantCtxRepo = new GetTenantMessagingContextRepository();
const upsertConversation = new UpsertConversationRepository();
const createMessage = new CreateMessageRepository();

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function buttonsFor(key: string): ReplyButton[] | undefined {
  if (key === 'appointment_confirmation') return [{ text: 'Confirmar' }, { text: 'Cancelar' }];
  if (key === 'waitlist_offer') return [{ text: 'Quero este horário' }];
  return undefined;
}

export async function sendWhatsappMessageJob(payload: JobPayload): Promise<void> {
  const ctx: RequestContext = {
    tenantId: payload.tenantId,
    userId: '',
    requestId: payload.requestId,
  };
  const automationRunId = str(payload.automationRunId);
  const templateKey = str(payload.templateKey);
  const channel = str(payload.channel);
  if (channel === 'EMAIL' || channel === 'COPY') return;
  const appointmentId = str(payload.appointmentId);
  const patientIdHint = str(payload.patientId);
  const relatedType = str(payload.relatedType);
  const relatedId = str(payload.relatedId);

  if (automationRunId) {
    const run = await getRun.execute(ctx, automationRunId);
    if (!run) return;
    if (run.executedAt) return;
    if (!run.automation.enabled) {
      await markRun.execute(ctx, run.id, { result: 'SKIPPED_CANCELLED' });
      return;
    }
  }

  const account = await getAccount.execute(ctx);
  if (!account || account.status !== 'CONNECTED' || account.killSwitch) {
    if (automationRunId) {
      await markRun.execute(ctx, automationRunId, {
        result: account?.killSwitch ? 'SKIPPED_KILL_SWITCH' : 'SKIPPED_DISCONNECTED',
      });
    }
    return;
  }

  const key = templateKey ?? 'appointment_created';
  const template = await getTemplate.execute(ctx, key);
  if (!template || template.status !== 'ACTIVE') {
    if (automationRunId) await markRun.execute(ctx, automationRunId, { result: 'FAILED' });
    logger.warn({ tenantId: ctx.tenantId, templateKey: key }, 'messaging_template_missing');
    return;
  }

  const appointment = appointmentId ? await getAppointmentById(ctx, appointmentId) : null;
  if (appointment && key !== 'appointment_cancelled') {
    if (appointment.status === 'REQUESTED') {
      if (automationRunId) await markRun.execute(ctx, automationRunId, { result: 'SKIPPED_REQUESTED' });
      return;
    }
    if (appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW') {
      if (automationRunId) await markRun.execute(ctx, automationRunId, { result: 'SKIPPED_CANCELLED' });
      return;
    }
  }

  const patientId = patientIdHint ?? appointment?.patientId ?? null;
  if (!patientId) {
    if (automationRunId) await markRun.execute(ctx, automationRunId, { result: 'FAILED' });
    return;
  }
  const patient = await getPatientById(ctx, patientId);
  if (!patient?.phonePrimary) {
    if (automationRunId) await markRun.execute(ctx, automationRunId, { result: 'FAILED' });
    return;
  }

  if (template.category === 'MARKETING') {
    const consented = await hasMarketingConsent(ctx, patientId);
    if (!consented) {
      if (automationRunId) await markRun.execute(ctx, automationRunId, { result: 'SKIPPED_NO_CONSENT' });
      const conversation = await upsertConversation.execute(ctx, {
        whatsappAccountId: account.id,
        contactPhone: toE164Br(patient.phonePrimary),
        contactName: patient.name,
        patientId,
      });
      await createMessage.execute(ctx, {
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        type: 'TEMPLATE',
        templateId: template.id,
        body: null,
        status: 'FAILED',
        errorCode: 'BLOCKED_NO_CONSENT',
        errorMessage: 'Sem consentimento de marketing.',
        billable: false,
        relatedType: relatedType ?? (appointmentId ? 'APPOINTMENT' : null),
        relatedId: relatedId ?? appointmentId,
      });
      return;
    }
  }

  const tenant = await tenantCtxRepo.execute(ctx);
  const startsAt = appointment ? new Date(appointment.startsAt) : new Date();
  const publicUrl = str(payload.publicUrl) ?? str(payload.link) ?? '';
  const variables = {
    nome: patient.name.split(' ')[0] ?? patient.name,
    clinica: tenant.name,
    data: formatYmdInTz(startsAt, tenant.timezone),
    hora: formatHmInTz(startsAt, tenant.timezone),
    link: publicUrl,
    valor: str(payload.valor) ?? '',
  };
  const body = renderTemplateBody(template.body, variables);

  try {
    const sent = await getMessagingProvider().sendTemplate({
      sessionName: account.sessionName,
      to: toE164Br(patient.phonePrimary),
      body,
      buttons: buttonsFor(key),
      marketing: template.category === 'MARKETING',
    });

    const conversation = await upsertConversation.execute(ctx, {
      whatsappAccountId: account.id,
      contactPhone: toE164Br(patient.phonePrimary),
      contactName: patient.name,
      patientId,
    });
    const message = await createMessage.execute(ctx, {
      conversationId: conversation.id,
      direction: 'OUTBOUND',
      type: 'TEMPLATE',
      templateId: template.id,
      body,
      providerMessageId: sent.providerMessageId,
      status: 'SENT',
      billable: false,
      relatedType: relatedType ?? (appointmentId ? 'APPOINTMENT' : null),
      relatedId: relatedId ?? appointmentId,
    });
    if (automationRunId) {
      await markRun.execute(ctx, automationRunId, { result: 'SENT', messageId: message.id });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, tenantId: ctx.tenantId, templateKey: key }, 'messaging_send_failed');
    if (automationRunId) await markRun.execute(ctx, automationRunId, { result: 'FAILED' });
    throw new Error(message);
  }
}
