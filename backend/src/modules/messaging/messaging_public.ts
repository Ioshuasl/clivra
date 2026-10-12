import type { DbTransaction } from '../../shared/database/db_transaction.js';
import type { RequestContext } from '../../shared/domain/request_context.js';
import { DEFAULT_BOOKING_SETTINGS } from '../clinic/clinic_public.js';
import { MessagingOnboardingRepository } from './repositories/onboarding/messaging_onboarding.repository.js';
import { GetAccountRepository } from './repositories/whatsapp_account/whatsapp_account.repository.js';
import { DisableAllAutomationsRepository } from './repositories/automation/automation.repository.js';
import {
  ScheduleService,
  type NotificationScheduleInput,
  type NotificationScheduler,
} from './services/notification/notification_schedule.service.js';
import type { WhatsappAccountSummary } from './types/messaging.types.js';

const onboarding = new MessagingOnboardingRepository();
const getAccount = new GetAccountRepository();
const scheduleService = new ScheduleService();
const disableAutomationsRepo = new DisableAllAutomationsRepository();

/** Seed automations D-1/H-3/waitlist + créditos de cortesia no signup. */
export async function seedMessagingOnSignup(
  tx: DbTransaction,
  input: { tenantId: string; idNext: () => string; courtesyCredits?: number },
): Promise<void> {
  await onboarding.execute(tx, {
    tenantId: input.tenantId,
    idNext: input.idNext,
    courtesyCredits: input.courtesyCredits ?? DEFAULT_BOOKING_SETTINGS.courtesyTransactionalMessages,
  });
}

/** Desliga todas as automações do tenant (suspensão / disconnect WA). */
export async function disableAllAutomations(ctx: RequestContext): Promise<void> {
  await disableAutomationsRepo.execute(ctx);
}

/** Status da conta WABA para outros BCs (somente leitura). */
export async function getWhatsappAccountStatus(
  ctx: RequestContext,
): Promise<WhatsappAccountSummary | null> {
  const account = await getAccount.execute(ctx);
  if (!account) return null;
  return {
    id: account.id,
    sessionName: account.sessionName,
    displayPhone: account.displayPhone,
    status: account.status,
    killSwitch: account.killSwitch,
    lastError: account.lastError,
    riskAcceptedAt: account.riskAcceptedAt,
    webhookVerifiedAt: account.webhookVerifiedAt,
    createdAt: account.createdAt,
  };
}

export async function scheduleAppointmentNotifications(
  ctx: RequestContext,
  input: NotificationScheduleInput,
  scheduler: NotificationScheduler,
): Promise<void> {
  await scheduleService.execute(ctx, input, scheduler);
}

export type { NotificationScheduleInput, NotificationScheduler } from './services/notification/notification_schedule.service.js';
export type { WhatsappAccountSummary } from './types/messaging.types.js';
