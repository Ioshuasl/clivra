import type { Prisma } from '@prisma/client';
import type { DomainEvent } from '../domain/domain_event.js';
import { idGenerator } from '../helpers/id_generator.js';
import type { DbTransaction } from './db_transaction.js';

export type OutboxEventRow = {
  id: string;
  tenantId: string;
  name: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  processedAt: Date | null;
  attempts: number;
  lastError: string | null;
};

export async function appendOutboxEvent(
  tx: DbTransaction,
  input: { tenantId: string; event: DomainEvent },
): Promise<string> {
  const id = idGenerator.next();
  await tx.outboxEvent.create({
    data: {
      id,
      tenantId: input.tenantId,
      name: input.event.name,
      payload: input.event.payload as Prisma.InputJsonValue,
      occurredAt: input.event.occurredAt ?? new Date(),
    },
  });
  return id;
}

export async function appendOutboxEvents(
  tx: DbTransaction,
  tenantId: string,
  events: readonly DomainEvent[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const event of events) {
    ids.push(await appendOutboxEvent(tx, { tenantId, event }));
  }
  return ids;
}

export async function listPendingOutboxEvents(
  tx: DbTransaction,
  limit = 50,
): Promise<OutboxEventRow[]> {
  const rows = await tx.outboxEvent.findMany({
    where: { processedAt: null },
    orderBy: { occurredAt: 'asc' },
    take: limit,
  });
  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    occurredAt: row.occurredAt,
    processedAt: row.processedAt,
    attempts: row.attempts,
    lastError: row.lastError,
  }));
}

export async function markOutboxProcessed(tx: DbTransaction, eventId: string): Promise<void> {
  await tx.outboxEvent.update({
    where: { id: eventId },
    data: { processedAt: new Date(), lastError: null },
  });
}

export async function markOutboxEnqueueError(
  tx: DbTransaction,
  eventId: string,
  lastError: string,
): Promise<void> {
  await tx.outboxEvent.update({
    where: { id: eventId },
    data: {
      attempts: { increment: 1 },
      lastError: lastError.slice(0, 500),
    },
  });
}
