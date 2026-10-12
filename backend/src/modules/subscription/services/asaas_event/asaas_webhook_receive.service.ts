import { createHash, timingSafeEqual } from 'node:crypto';
import { asaasConfig } from '../../../../shared/config/env.js';
import { logger } from '../../../../shared/config/logger.js';
import { asaasWebhookBodySchema } from '../../../../shared/integrations/asaas/asaas.types.js';
import { getJobQueue } from '../../../../shared/queue/job_queue_singleton.js';
import { JOB, QUEUE } from '../../../../shared/queue/queue_names.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import { InvalidWebhookTokenError } from '../../models/errors/subscription.errors.js';
import { AsaasEventRepository } from '../../repositories/asaas_event/asaas_event.repository.js';

const ZERO_TENANT = '00000000-0000-0000-0000-000000000000';

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/** Comparação em tempo constante (hash antes, para tamanhos iguais). */
export function isValidWebhookToken(received: string | undefined): boolean {
  const expected = asaasConfig().webhookToken;
  if (!expected || !received) return false;
  return timingSafeEqual(sha256(received), sha256(expected));
}

/**
 * Entrada do webhook: valida o token, persiste o evento (UNIQUE no id) e enfileira.
 * Nenhuma regra de negócio aqui — o Asaas só aceita HTTP 200 e pausa a fila após 15 falhas.
 */
export class ReceiveWebhookService {
  constructor(private readonly events = new AsaasEventRepository()) {}

  async execute(token: string | undefined, rawBody: unknown): Promise<{ duplicate: boolean }> {
    if (!isValidWebhookToken(token)) throw new InvalidWebhookTokenError();

    const parsed = asaasWebhookBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Evento de webhook inválido.', 400);
    }

    const rowId = await this.events.insertIfNew({
      asaasEventId: parsed.data.id,
      event: parsed.data.event,
      payload: rawBody,
    });
    if (!rowId) return { duplicate: true };

    try {
      await getJobQueue().add(
        QUEUE.platform,
        JOB.processAsaasEvent,
        { tenantId: ZERO_TENANT, requestId: `asaas-event:${rowId}`, asaasEventRowId: rowId },
        { jobId: `asaas-event-${rowId}` },
      );
    } catch (err) {
      // O evento já está persistido (PENDING): o varredor do worker o reprocessa. Responder 200 é o correto.
      logger.warn(
        { eventRowId: rowId, reason: err instanceof Error ? err.message : 'unknown' },
        'asaas_event_enqueue_failed',
      );
    }
    return { duplicate: false };
  }
}
