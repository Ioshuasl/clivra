import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { OutboxDispatcher } from '../src/shared/database/outbox_dispatcher.js';
import { getPrismaClient, getTenantPrisma } from '../src/shared/database/tenant_prisma.js';
import { UnitOfWork } from '../src/shared/database/unit_of_work.js';
import type { RequestContext } from '../src/shared/domain/request_context.js';
import { idGenerator } from '../src/shared/helpers/id_generator.js';
import { InMemoryJobQueue } from '../src/shared/queue/in_memory_job_queue.js';
import { JOB, QUEUE } from '../src/shared/queue/queue_names.js';

async function main() {
  const app = createApp();
  const server = app.listen(0) as Server;
  await once(server, 'listening');
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('no port');
  const origin = `http://127.0.0.1:${addr.port}`;
  let failed = false;

  const health = await fetch(`${origin}/health`);
  const healthBody = (await health.json()) as { data?: { status?: string; service?: string } };
  console.log('api_health', health.status, healthBody.data);
  if (health.status !== 200 || healthBody.data?.status !== 'ok' || healthBody.data?.service !== 'api') {
    console.error('FAIL: API /health sem Redis deveria responder 200');
    failed = true;
  }

  const db = getTenantPrisma();
  const tenantId = idGenerator.next();
  const userId = idGenerator.next();
  const requestId = idGenerator.next();
  const ctx: RequestContext = { tenantId, userId, requestId };

  await db.runProvisioning(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantId,
        name: 'Clinica Outbox Smoke',
        slug: `outbox-${tenantId.slice(0, 8)}`,
        updatedAt: new Date(),
      },
    });
  });

  const uow = new UnitOfWork(db);
  await uow.run(ctx, async ({ tx, publish }) => {
    await tx.auditLog.create({
      data: {
        id: idGenerator.next(),
        tenantId,
        actorType: 'SYSTEM',
        action: 'CREATE',
        resourceType: 'outbox_smoke',
        resourceId: tenantId,
      },
    });
    publish([{ name: 'platform.smoke_ping', payload: { requestId } }]);
  });

  const pendingAfterCommit = await db.runInTenantContext(ctx, (tx) =>
    tx.outboxEvent.findMany({ where: { processedAt: null } }),
  );
  console.log('pending_after_uow', pendingAfterCommit.length);
  if (pendingAfterCommit.length !== 1) {
    console.error('FAIL: UoW deveria persistir 1 outbox pendente neste tenant');
    failed = true;
  }

  const queue = new InMemoryJobQueue();
  queue.register(QUEUE.platform, JOB.smokePing, async (payload) => {
    if (!payload.tenantId || !payload.requestId) {
      throw new Error('payload_missing_tenant_or_request');
    }
  });

  const dispatcher = new OutboxDispatcher(queue, db);
  const dispatched = await dispatcher.dispatchOnce(100);
  await queue.drain();
  const firstJob = queue.processed.find(
    (job) => job.payload.tenantId === tenantId && job.payload.requestId === requestId,
  );
  console.log('dispatched', dispatched, 'processed', queue.processed.length, 'this_tenant', Boolean(firstJob));
  if (!firstJob) {
    console.error('FAIL: dispatcher+fake deveria processar smoke_ping deste tenant');
    failed = true;
  }

  const remaining = await db.runInTenantContext(ctx, (tx) =>
    tx.outboxEvent.findMany({ where: { processedAt: null } }),
  );
  if (remaining.length !== 0) {
    console.error('FAIL: outbox deste tenant deveria estar processed após enqueue');
    failed = true;
  }

  const requestIdDown = idGenerator.next();
  await uow.run(ctx, async ({ publish }) => {
    publish([{ name: 'platform.smoke_ping', payload: { requestId: requestIdDown } }]);
  });
  queue.setUnavailable(true);
  const whileDown = await dispatcher.dispatchOnce(100);
  const stillPending = await db.runInTenantContext(ctx, (tx) =>
    tx.outboxEvent.findMany({ where: { processedAt: null } }),
  );
  console.log('redis_down_dispatched', whileDown, 'still_pending', stillPending.length);
  if (stillPending.length !== 1) {
    console.error('FAIL: Redis down deveria deixar outbox deste tenant pendente');
    failed = true;
  }
  if (stillPending[0] && stillPending[0].attempts !== 0) {
    console.error('FAIL: Redis down não deve incrementar attempts');
    failed = true;
  }

  queue.setUnavailable(false);
  const afterUp = await dispatcher.dispatchOnce(100);
  await queue.drain();
  const recovered = queue.processed.find(
    (job) => job.payload.tenantId === tenantId && job.payload.requestId === requestIdDown,
  );
  const pendingAfterUp = await db.runInTenantContext(ctx, (tx) =>
    tx.outboxEvent.findMany({ where: { processedAt: null } }),
  );
  console.log('redis_up_dispatched', afterUp, 'recovered', Boolean(recovered));
  if (!recovered || pendingAfterUp.length !== 0) {
    console.error('FAIL: ao voltar Redis deveria despachar o pendente deste tenant');
    failed = true;
  }

  await uow.run(ctx, async ({ publish }) => {
    publish([{ name: 'platform.unknown_event', payload: { requestId: idGenerator.next() } }]);
  });
  const unknownDispatched = await dispatcher.dispatchOnce(100);
  const unknownRows = await db.runInTenantContext(ctx, (tx) =>
    tx.outboxEvent.findMany({ where: { name: 'platform.unknown_event' } }),
  );
  console.log('unknown_dispatched', unknownDispatched, 'attempts', unknownRows[0]?.attempts);
  if (!unknownRows[0] || unknownRows[0].attempts < 1 || unknownRows[0].processedAt) {
    console.error('FAIL: evento sem rota deveria incrementar attempts + last_error');
    failed = true;
  }
  if (unknownRows[0] && !unknownRows[0].lastError?.startsWith('NO_ROUTE:')) {
    console.error('FAIL: last_error deveria indicar NO_ROUTE');
    failed = true;
  }

  server.close();
  await getPrismaClient().$disconnect();

  if (failed) {
    process.exit(1);
  }
  console.log('OK: outbox smoke passed');
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
