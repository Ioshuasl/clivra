import type { JobName, QueueName } from './queue_names.js';
import { JOB, QUEUE } from './queue_names.js';

export type OutboxRoute = {
  queue: QueueName;
  job: JobName;
};

export type OutboxRouteTarget = OutboxRoute | OutboxRoute[] | 'emit-only';

/**
 * Evento de domínio → fila/job. `emit-only` = persiste o evento sem worker (reporting depois).
 */
export const OUTBOX_ROUTES: Record<string, OutboxRouteTarget> = {
  'platform.smoke_ping': { queue: QUEUE.platform, job: JOB.smokePing },
  'patients.patient_created': { queue: QUEUE.platform, job: JOB.ensureMedicalRecord },
  'scheduling.appointment_scheduled': {
    queue: QUEUE.scheduling,
    job: JOB.scheduleAppointmentNotifications,
  },
  'scheduling.appointment_confirmed': {
    queue: QUEUE.scheduling,
    job: JOB.scheduleAppointmentNotifications,
  },
  'scheduling.appointment_rescheduled': {
    queue: QUEUE.scheduling,
    job: JOB.scheduleAppointmentNotifications,
  },
  'scheduling.appointment_cancelled': [
    { queue: QUEUE.scheduling, job: JOB.offerWaitlistSlot },
    { queue: QUEUE.scheduling, job: JOB.scheduleAppointmentNotifications },
  ],
  'scheduling.appointment_no_show': [
    { queue: QUEUE.scheduling, job: JOB.offerWaitlistSlot },
    { queue: QUEUE.scheduling, job: JOB.scheduleAppointmentNotifications },
  ],
  'scheduling.waitlist_offer_sent': {
    queue: QUEUE.scheduling,
    job: JOB.scheduleAppointmentNotifications,
  },
  'scheduling.waitlist_offer_accepted': 'emit-only',
  'scheduling.appointment_started': 'emit-only',
  'messaging.confirmation_received': 'emit-only',
  'messaging.cancellation_received': 'emit-only',
  'messaging.waitlist_offer_accepted': 'emit-only',
  'messaging.credits_low': 'emit-only',
  'messaging.credits_exhausted': 'emit-only',
  'clinical_records.critical_alert_created': 'emit-only',
  'clinical_records.odontogram_updated': 'emit-only',
  'clinical_records.note_created': 'emit-only',
  'clinical_records.note_amended': 'emit-only',
  'clinical_records.attachment_created': {
    queue: QUEUE.platform,
    job: JOB.generateAttachmentThumbnail,
  },
  'clinical_records.anamnesis_request_sent': {
    queue: QUEUE.messaging,
    job: JOB.sendWhatsappMessage,
  },
  'documents.signature_link_sent': { queue: QUEUE.messaging, job: JOB.sendWhatsappMessage },
  'documents.signature_code_requested': { queue: QUEUE.messaging, job: JOB.sendWhatsappMessage },
  'treatments.quote_created': 'emit-only',
  'treatments.quote_sent': [
    { queue: QUEUE.platform, job: JOB.generateQuotePdf },
    { queue: QUEUE.messaging, job: JOB.sendWhatsappMessage },
  ],
  'treatments.quote_expired': 'emit-only',
  'treatments.quote_approved': 'emit-only',
  'treatments.quote_rejected': 'emit-only',
  'treatments.plan_created': 'emit-only',
  'treatments.item_executed': 'emit-only',
  'treatments.plan_completed': 'emit-only',
  'billing.receivable_created': 'emit-only',
  'billing.receivable_cancelled': 'emit-only',
  'billing.payment_registered': { queue: QUEUE.platform, job: JOB.generateReceiptPdf },
  'billing.payment_reversed': 'emit-only',
  'billing.receipt_sent': { queue: QUEUE.messaging, job: JOB.sendWhatsappMessage },
  'billing.installment_charged': { queue: QUEUE.messaging, job: JOB.sendWhatsappMessage },
  'billing.cash_session_opened': 'emit-only',
  'billing.cash_session_closed': 'emit-only',
  'billing.payable_paid': 'emit-only',
  'billing.installment_overdue': 'emit-only',
  'platform.tenant_export_requested': { queue: QUEUE.platform, job: JOB.tenantExport },
  'platform.patient_package_requested': { queue: QUEUE.platform, job: JOB.patientPackage },
  'platform.patient_anonymize_requested': { queue: QUEUE.platform, job: JOB.patientAnonymize },
  'platform.data_export_completed': 'emit-only',
  'subscription.checkout_created': 'emit-only',
  'subscription.subscription_activated': 'emit-only',
  'subscription.payment_failed': 'emit-only',
  'subscription.subscription_suspended': 'emit-only',
  'subscription.subscription_cancelled': 'emit-only',
  'reporting.export_requested': { queue: QUEUE.reporting, job: JOB.generateExport },
};
