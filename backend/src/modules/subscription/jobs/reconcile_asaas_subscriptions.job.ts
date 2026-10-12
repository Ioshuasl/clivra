import { logger } from '../../../shared/config/logger.js';
import type { JobPayload } from '../../../shared/queue/job_payload.js';
import { ReconcileAction } from '../actions/subscription/subscription_reconcile.action.js';
import { SuspendPastDueAction } from '../actions/subscription/subscription_suspend_past_due.action.js';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

function ctxFrom(payload: JobPayload) {
  return { tenantId: payload.tenantId, userId: SYSTEM_USER_ID, requestId: payload.requestId };
}

/** Reconcilia a assinatura de um tenant com o Asaas (rede de segurança dos webhooks). */
export async function reconcileAsaasSubscriptionJob(payload: JobPayload): Promise<void> {
  const summary = await new ReconcileAction().execute(ctxFrom(payload));
  logger.info({ tenantId: payload.tenantId, requestId: payload.requestId, ...summary }, 'asaas_reconcile_job');
}

/** PAST_DUE → SUSPENDED após 7 dias de cobrança vencida em aberto. */
export async function suspendPastDueJob(payload: JobPayload): Promise<void> {
  const result = await new SuspendPastDueAction().execute(ctxFrom(payload));
  if (result.suspended) {
    logger.info({ tenantId: payload.tenantId, requestId: payload.requestId }, 'subscription_suspended_past_due');
  }
}
