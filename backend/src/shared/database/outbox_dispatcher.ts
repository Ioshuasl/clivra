import { logger } from '../config/logger.js';
import type { RequestContext } from '../domain/request_context.js';
import { jobPayloadSchema } from '../queue/job_payload.js';
import { RedisUnavailableError, type JobQueue } from '../queue/job_queue.port.js';
import { OUTBOX_ROUTES } from '../queue/outbox_routes.js';
import {
  listPendingOutboxEvents,
  markOutboxEnqueueError,
  markOutboxProcessed,
  type OutboxEventRow,
} from './outbox.js';
import { getTenantPrisma, type TenantPrisma } from './tenant_prisma.js';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
const MAX_ENQUEUE_ATTEMPTS = 8;

export class OutboxDispatcher {
  constructor(
    private readonly queue: JobQueue,
    private readonly db: TenantPrisma = getTenantPrisma(),
  ) {}

  /** Lê pendentes, enfileira (jobId = event.id) e marca processed. Redis down → deixa pendente. */
  async dispatchOnce(limit = 50): Promise<number> {
    const pending = await this.db.runOutboxDispatch((tx) => listPendingOutboxEvents(tx, limit));
    let dispatched = 0;

    for (const event of pending) {
      if (event.attempts >= MAX_ENQUEUE_ATTEMPTS) continue;

      const route = OUTBOX_ROUTES[event.name];
      if (!route) {
        await this.recordError(event, `NO_ROUTE:${event.name}`);
        continue;
      }

      const requestId = requestIdFrom(event);
      const payload = jobPayloadSchema.parse({
        ...event.payload,
        tenantId: event.tenantId,
        requestId,
        eventId: event.id,
        eventName: event.name,
      });

      try {
        if (route !== 'emit-only') {
          const routes = Array.isArray(route) ? route : [route];
          for (const target of routes) {
            const jobId = routes.length === 1 ? event.id : `${event.id}:${target.job}`;
            await this.queue.add(target.queue, target.job, payload, { jobId });
          }
        }
        await this.db.runInTenantContext(ctxFor(event, requestId), (tx) =>
          markOutboxProcessed(tx, event.id),
        );
        dispatched += 1;
      } catch (err) {
        if (err instanceof RedisUnavailableError) {
          logger.warn(
            { eventId: event.id, tenantId: event.tenantId, requestId },
            'outbox_enqueue_redis_unavailable',
          );
          break;
        }
        const message = err instanceof Error ? err.message : String(err);
        await this.recordError(event, message);
      }
    }

    return dispatched;
  }

  private async recordError(event: OutboxEventRow, lastError: string): Promise<void> {
    if (event.attempts + 1 >= MAX_ENQUEUE_ATTEMPTS) {
      logger.error(
        { eventId: event.id, name: event.name, tenantId: event.tenantId, lastError },
        'outbox_event_exhausted',
      );
    }
    await this.db.runInTenantContext(ctxFor(event, requestIdFrom(event)), (tx) =>
      markOutboxEnqueueError(tx, event.id, lastError),
    );
  }
}

function requestIdFrom(event: OutboxEventRow): string {
  const fromPayload = event.payload.requestId;
  return typeof fromPayload === 'string' && fromPayload.length > 0 ? fromPayload : event.id;
}

function ctxFor(event: OutboxEventRow, requestId: string): RequestContext {
  return {
    tenantId: event.tenantId,
    userId: SYSTEM_USER_ID,
    requestId,
  };
}
