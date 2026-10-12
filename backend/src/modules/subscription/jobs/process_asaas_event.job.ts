import { logger } from '../../../shared/config/logger.js';
import type { JobPayload } from '../../../shared/queue/job_payload.js';
import { ProcessAsaasEventAction } from '../actions/subscription/asaas_event_process.action.js';
import { AsaasEventRepository } from '../repositories/asaas_event/asaas_event.repository.js';

const STUCK_AFTER_MINUTES = 5;

/** Processa um evento do webhook já persistido. Falha → BullMQ repete (backoff) e, no fim, DLQ. */
export async function processAsaasEventJob(payload: JobPayload): Promise<void> {
  const eventRowId = typeof payload.asaasEventRowId === 'string' ? payload.asaasEventRowId : null;
  if (!eventRowId) return;
  await new ProcessAsaasEventAction().execute(eventRowId);
  logger.info({ requestId: payload.requestId, eventRowId }, 'asaas_event_processed');
}

/**
 * Varredor: reprocessa eventos que ficaram PENDING/FAILED (Redis fora na entrada, job perdido).
 * Cada evento é idempotente, então reprocessar é seguro.
 */
export async function sweepStuckAsaasEvents(): Promise<number> {
  const events = new AsaasEventRepository();
  const stuck = await events.listStuck(STUCK_AFTER_MINUTES);
  const action = new ProcessAsaasEventAction();
  let processed = 0;
  for (const row of stuck) {
    try {
      await action.execute(row.id);
      processed += 1;
    } catch (err) {
      logger.error({ err, eventRowId: row.id }, 'asaas_event_sweep_failed');
    }
  }
  if (stuck.length > 0) {
    logger.warn({ stuck: stuck.length, processed }, 'asaas_events_stuck');
  }
  return processed;
}
