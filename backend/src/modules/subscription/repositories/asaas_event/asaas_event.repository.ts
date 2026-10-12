import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../../shared/database/tenant_prisma.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';
import type { AsaasEventRow } from '../../types/billing/subscription_payment.types.js';

type EventSqlRow = {
  id: string;
  asaas_event_id: string;
  event: string;
  tenant_id: string | null;
  payload: unknown;
  status: string;
  attempts: number;
  received_at: Date;
};

function mapEvent(row: EventSqlRow): AsaasEventRow {
  return {
    id: row.id,
    asaasEventId: row.asaas_event_id,
    event: row.event,
    tenantId: row.tenant_id,
    payload: row.payload,
    status: row.status,
    attempts: row.attempts,
    receivedAt: row.received_at,
  };
}

/** Eventos do webhook em `platform.asaas_event` (sem RLS). UNIQUE(asaas_event_id) = idempotência. */
export class AsaasEventRepository {
  /** Devolve o id interno se o evento é novo; `null` se já havia sido recebido (duplicado). */
  async insertIfNew(input: {
    asaasEventId: string;
    event: string;
    payload: unknown;
  }): Promise<string | null> {
    const id = idGenerator.next();
    const rows = await getPrismaClient().$queryRaw<Array<{ id: string }>>(Prisma.sql`
      INSERT INTO platform.asaas_event (id, asaas_event_id, event, payload, status)
      VALUES (${id}::uuid, ${input.asaasEventId}, ${input.event}, ${JSON.stringify(input.payload)}::jsonb, 'PENDING')
      ON CONFLICT (asaas_event_id) DO NOTHING
      RETURNING id
    `);
    return rows[0]?.id ?? null;
  }

  async get(id: string): Promise<AsaasEventRow | null> {
    const rows = await getPrismaClient().$queryRaw<EventSqlRow[]>(Prisma.sql`
      SELECT id, asaas_event_id, event, tenant_id, payload, status, attempts, received_at
      FROM platform.asaas_event WHERE id = ${id}::uuid
    `);
    return rows[0] ? mapEvent(rows[0]) : null;
  }

  async getByAsaasEventId(asaasEventId: string): Promise<AsaasEventRow | null> {
    const rows = await getPrismaClient().$queryRaw<EventSqlRow[]>(Prisma.sql`
      SELECT id, asaas_event_id, event, tenant_id, payload, status, attempts, received_at
      FROM platform.asaas_event WHERE asaas_event_id = ${asaasEventId}
    `);
    return rows[0] ? mapEvent(rows[0]) : null;
  }

  async markDone(id: string, tenantId: string | null): Promise<void> {
    await getPrismaClient().$executeRaw(Prisma.sql`
      UPDATE platform.asaas_event
      SET status = 'DONE', processed_at = NOW(), last_error = NULL, tenant_id = ${tenantId}::uuid
      WHERE id = ${id}::uuid
    `);
  }

  async markFailed(id: string, message: string): Promise<void> {
    await getPrismaClient().$executeRaw(Prisma.sql`
      UPDATE platform.asaas_event
      SET status = 'FAILED', attempts = attempts + 1, last_error = ${message.slice(0, 500)}
      WHERE id = ${id}::uuid
    `);
  }

  /** Eventos que ficaram PENDING/FAILED por mais de `olderThanMinutes` (alerta e reprocesso). */
  async listStuck(olderThanMinutes: number, limit = 100): Promise<AsaasEventRow[]> {
    const rows = await getPrismaClient().$queryRaw<EventSqlRow[]>(Prisma.sql`
      SELECT id, asaas_event_id, event, tenant_id, payload, status, attempts, received_at
      FROM platform.asaas_event
      WHERE status <> 'DONE' AND received_at < NOW() - make_interval(mins => ${olderThanMinutes}::int)
      ORDER BY received_at ASC
      LIMIT ${limit}
    `);
    return rows.map(mapEvent);
  }
}
