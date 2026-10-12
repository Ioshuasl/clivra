import type { RequestContext } from '../../../../shared/domain/request_context.js';
import type { JobPayload } from '../../../../shared/queue/job_payload.js';
import type { EnqueueOptions } from '../../../../shared/queue/job_queue.port.js';
import {
  GetAutomationByKeyRepository,
  SkipAutomationRunsForTargetRepository,
  UpsertAutomationRunRepository,
} from '../../repositories/automation/automation.repository.js';
import { GetTenantMessagingContextRepository } from '../../repositories/credit/credit.repository.js';
import {
  applyQuietHours,
  confirmationD1At,
  delayMsFrom,
  notificationJobId,
  reminderH3At,
} from '../../helpers/quiet_hours.helper.js';
import { parseAutomationConfig } from '../../helpers/messaging_mapper.helper.js';

export type NotificationScheduleInput = {
  eventName: string;
  appointmentId?: string;
  appointmentStatus?: string;
  startsAt?: string;
  patientId?: string;
  offerId?: string;
  waitlistEntryId?: string;
  buttonPayload?: string;
  templateKey?: string;
};

export type NotificationScheduler = {
  enqueueSend: (payload: JobPayload, options: EnqueueOptions) => Promise<void>;
  cancelSend: (jobId: string) => Promise<void>;
};

const APPOINTMENT_KEYS = ['CONFIRMATION_D1', 'REMINDER_H3', 'CREATED', 'CANCELLED'] as const;

export class ScheduleService {
  constructor(
    private readonly getAutomation = new GetAutomationByKeyRepository(),
    private readonly upsertRun = new UpsertAutomationRunRepository(),
    private readonly skipRuns = new SkipAutomationRunsForTargetRepository(),
    private readonly tenantCtx = new GetTenantMessagingContextRepository(),
  ) {}

  async execute(
    ctx: RequestContext,
    input: NotificationScheduleInput,
    scheduler: NotificationScheduler,
  ): Promise<void> {
    if (input.eventName === 'scheduling.waitlist_offer_sent') {
      await this.scheduleWaitlist(ctx, input, scheduler);
      return;
    }

    const appointmentId = input.appointmentId;
    if (!appointmentId) return;

    await this.cancelAppointmentJobs(appointmentId, scheduler);

    if (
      input.eventName === 'scheduling.appointment_cancelled' ||
      input.eventName === 'scheduling.appointment_no_show'
    ) {
      await this.skipRuns.execute(ctx, 'APPOINTMENT', appointmentId, 'SKIPPED_CANCELLED');
      if (input.eventName === 'scheduling.appointment_cancelled' && input.patientId && input.startsAt) {
        await this.enqueueCancelled(ctx, input, scheduler);
      }
      return;
    }

    const status = input.appointmentStatus ?? '';
    if (status === 'REQUESTED' || status === 'CANCELLED' || status === 'NO_SHOW') return;
    if (!input.startsAt || !input.patientId) return;

    const tenant = await this.tenantCtx.execute(ctx);
    const startsAt = new Date(input.startsAt);

    if (input.eventName === 'scheduling.appointment_scheduled') {
      const when = applyQuietHours(new Date(), tenant.timezone);
      await scheduler.enqueueSend(
        basePayload(ctx, {
          templateKey: 'appointment_created',
          appointmentId,
          patientId: input.patientId,
          relatedType: 'APPOINTMENT',
          relatedId: appointmentId,
          buttonPayload: `CONFIRM_${appointmentId}`,
        }),
        { jobId: notificationJobId(appointmentId, 'CREATED'), delayMs: delayMsFrom(when) },
      );
    }

    await this.scheduleAutomation(ctx, scheduler, {
      key: 'CONFIRMATION_D1',
      appointmentId,
      patientId: input.patientId,
      status,
      scheduledFor: confirmationD1At(startsAt, tenant.timezone),
      templateKey: 'appointment_confirmation',
      buttonPayload: `CONFIRM_${appointmentId}`,
    });
    await this.scheduleAutomation(ctx, scheduler, {
      key: 'REMINDER_H3',
      appointmentId,
      patientId: input.patientId,
      status,
      scheduledFor: reminderH3At(startsAt, tenant.timezone),
      templateKey: 'appointment_reminder',
      buttonPayload: `CONFIRM_${appointmentId}`,
    });
  }

  private async scheduleWaitlist(
    ctx: RequestContext,
    input: NotificationScheduleInput,
    scheduler: NotificationScheduler,
  ): Promise<void> {
    const offerId = input.offerId ?? input.waitlistEntryId;
    const patientId = input.patientId;
    if (!offerId || !patientId) return;

    const automation = await this.getAutomation.execute(ctx, 'WAITLIST_OFFER');
    const tenant = await this.tenantCtx.execute(ctx);
    const when = applyQuietHours(new Date(), tenant.timezone);
    let automationRunId: string | undefined;
    if (automation?.enabled) {
      const run = await this.upsertRun.execute(ctx, {
        automationId: automation.id,
        targetType: 'WAITLIST_ENTRY',
        targetId: offerId,
        scheduledFor: when,
      });
      automationRunId = run.id;
    }
    await scheduler.enqueueSend(
      basePayload(ctx, {
        automationRunId,
        templateKey: input.templateKey ?? 'waitlist_offer',
        appointmentId: input.appointmentId,
        patientId,
        buttonPayload: input.buttonPayload ?? `WAITLIST_${offerId}`,
        relatedType: 'WAITLIST',
        relatedId: offerId,
      }),
      { jobId: `waitlist:${offerId}`, delayMs: delayMsFrom(when) },
    );
  }

  private async enqueueCancelled(
    ctx: RequestContext,
    input: NotificationScheduleInput,
    scheduler: NotificationScheduler,
  ): Promise<void> {
    const tenant = await this.tenantCtx.execute(ctx);
    const when = applyQuietHours(new Date(), tenant.timezone);
    await scheduler.enqueueSend(
      basePayload(ctx, {
        templateKey: 'appointment_cancelled',
        appointmentId: input.appointmentId,
        patientId: input.patientId,
        relatedType: 'APPOINTMENT',
        relatedId: input.appointmentId,
      }),
      {
        jobId: notificationJobId(input.appointmentId!, 'CANCELLED'),
        delayMs: delayMsFrom(when),
      },
    );
  }

  private async scheduleAutomation(
    ctx: RequestContext,
    scheduler: NotificationScheduler,
    input: {
      key: string;
      appointmentId: string;
      patientId: string;
      status: string;
      scheduledFor: Date;
      templateKey: string;
      buttonPayload: string;
    },
  ): Promise<void> {
    const automation = await this.getAutomation.execute(ctx, input.key);
    if (!automation?.enabled) return;
    const config = parseAutomationConfig(automation.config);
    const allowed = config.onlyForStatuses ?? ['SCHEDULED', 'CONFIRMED'];
    if (!allowed.includes(input.status)) return;

    const run = await this.upsertRun.execute(ctx, {
      automationId: automation.id,
      targetType: 'APPOINTMENT',
      targetId: input.appointmentId,
      scheduledFor: input.scheduledFor,
    });
    await scheduler.enqueueSend(
      basePayload(ctx, {
        automationRunId: run.id,
        templateKey: config.templateKey ?? input.templateKey,
        appointmentId: input.appointmentId,
        patientId: input.patientId,
        buttonPayload: input.buttonPayload,
        relatedType: 'APPOINTMENT',
        relatedId: input.appointmentId,
      }),
      {
        jobId: notificationJobId(input.appointmentId, input.key),
        delayMs: delayMsFrom(input.scheduledFor),
      },
    );
  }

  private async cancelAppointmentJobs(
    appointmentId: string,
    scheduler: NotificationScheduler,
  ): Promise<void> {
    for (const key of APPOINTMENT_KEYS) {
      await scheduler.cancelSend(notificationJobId(appointmentId, key));
    }
  }
}

function basePayload(
  ctx: RequestContext,
  extra: Record<string, unknown>,
): JobPayload {
  return {
    tenantId: ctx.tenantId,
    requestId: ctx.requestId,
    ...extra,
  };
}
