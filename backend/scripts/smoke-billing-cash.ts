import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { getPrismaClient } from '../src/shared/database/tenant_prisma.js';

type Json = { status: number; body: Record<string, unknown> | null };

async function main() {
  const app = createApp();
  const server = app.listen(0) as Server;
  await once(server, 'listening');
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('no port');
  const origin = `http://127.0.0.1:${addr.port}`;
  let failed = false;

  const jar = new Map<string, string>();
  const prisma = getPrismaClient();

  async function request(path: string, init: RequestInit = {}): Promise<Json> {
    const headers = new Headers(init.headers);
    if (jar.size > 0) {
      headers.set('cookie', [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '));
    }
    const res = await fetch(`${origin}${path}`, { ...init, headers });
    const setCookies = res.headers.getSetCookie?.() ?? [];
    for (const raw of setCookies) {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
    const text = await res.text();
    return { status: res.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null };
  }

  function dataOf(json: Json): Record<string, unknown> {
    return (json.body?.data ?? {}) as Record<string, unknown>;
  }

  function errorCode(json: Json): string | undefined {
    const err = json.body?.error as { code?: string } | undefined;
    return err?.code;
  }

  function authHeaders(token: string, tenantId?: string, extra?: Record<string, string>): HeadersInit {
    const headers: Record<string, string> = { authorization: `Bearer ${token}`, ...extra };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    return headers;
  }

  const password = 'SenhaForte!99';
  const stamp = Date.now();
  const signup = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `s6-billing-cash-${stamp}@example.com`,
      password,
      clinicName: 'Clinica Caixa',
      ownerName: 'Owner Caixa',
    }),
  });
  console.log('signup', signup.status);
  if (signup.status !== 201) failed = true;
  const token = dataOf(signup).accessToken as string;
  const tenantId = (dataOf(signup).tenant as { id: string }).id;

  const units = await request('/api/v1/clinic/units', { headers: authHeaders(token, tenantId) });
  const unitId = ((units.body?.data as Array<{ id: string }>) ?? [])[0]?.id;
  if (!unitId) failed = true;

  const emptyCurrent = await request(`/api/v1/cash-sessions/current?unitId=${unitId}`, {
    headers: authHeaders(token, tenantId),
  });
  console.log('current-empty', emptyCurrent.status, emptyCurrent.body?.data);
  if (emptyCurrent.status !== 200 || emptyCurrent.body?.data !== null) failed = true;

  const mismatch = await request('/api/v1/cash-sessions', {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': randomUUID() }),
    },
    body: JSON.stringify({
      unitId,
      openingCents: 10000,
      openingByMethod: [{ method: 'PIX', amountCents: 50 }],
    }),
  });
  console.log('opening-mismatch', mismatch.status, errorCode(mismatch));
  if (mismatch.status !== 422) failed = true;

  const openKey = randomUUID();
  const openBody = { unitId, openingCents: 10000 };
  const opened = await request('/api/v1/cash-sessions', {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': openKey }),
    },
    body: JSON.stringify(openBody),
  });
  console.log('open', opened.status, dataOf(opened).id);
  if (opened.status !== 201) failed = true;
  const sessionId = dataOf(opened).id as string;
  if (dataOf(opened).expectedCents !== 10000) failed = true;
  if (dataOf(opened).openTooLong !== false) failed = true;
  if (typeof dataOf(opened).openForHours !== 'number') failed = true;

  const replayOpen = await request('/api/v1/cash-sessions', {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': openKey }),
    },
    body: JSON.stringify(openBody),
  });
  console.log('open-replay', replayOpen.status);
  if (replayOpen.status !== 201) failed = true;
  if (dataOf(replayOpen).id !== sessionId) failed = true;

  const reusedOpen = await request('/api/v1/cash-sessions', {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': openKey }),
    },
    body: JSON.stringify({ unitId, openingCents: 1 }),
  });
  console.log('open-key-reused', reusedOpen.status, errorCode(reusedOpen));
  if (reusedOpen.status !== 409 || errorCode(reusedOpen) !== 'IDEMPOTENCY_KEY_REUSED') failed = true;

  const secondOpen = await request('/api/v1/cash-sessions', {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': randomUUID() }),
    },
    body: JSON.stringify(openBody),
  });
  console.log('second-open', secondOpen.status, errorCode(secondOpen));
  if (secondOpen.status !== 422) failed = true;

  const current = await request(`/api/v1/cash-sessions/current?unitId=${unitId}`, {
    headers: authHeaders(token, tenantId),
  });
  console.log('current', current.status, dataOf(current).expectedCents, dataOf(current).openTooLong);
  if (current.status !== 200) failed = true;
  if (dataOf(current).id !== sessionId) failed = true;
  if (dataOf(current).openTooLong !== false) failed = true;

  const shortReason = await request(`/api/v1/cash-sessions/${sessionId}/movements`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ kind: 'SUPPLY', amountCents: 5000, method: 'CASH', reason: 'curto' }),
  });
  console.log('movement-short', shortReason.status);
  if (shortReason.status !== 400) failed = true;

  const supply = await request(`/api/v1/cash-sessions/${sessionId}/movements`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      kind: 'SUPPLY',
      amountCents: 5000,
      method: 'CASH',
      reason: 'suprimento para troco do dia',
    }),
  });
  console.log('supply', supply.status, dataOf(supply).expectedCents);
  if (supply.status !== 201) failed = true;
  if (dataOf(supply).expectedCents !== 15000) failed = true;

  const withdrawal = await request(`/api/v1/cash-sessions/${sessionId}/movements`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      kind: 'WITHDRAWAL',
      amountCents: 2000,
      method: 'CASH',
      reason: 'sangria para cofre da clínica',
    }),
  });
  console.log('withdrawal', withdrawal.status, dataOf(withdrawal).expectedCents);
  if (withdrawal.status !== 201) failed = true;
  if (dataOf(withdrawal).expectedCents !== 13000) failed = true;

  const closeNoReason = await request(`/api/v1/cash-sessions/${sessionId}/close`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': randomUUID() }),
    },
    body: JSON.stringify({ countedByMethod: [{ method: 'CASH', countedCents: 10000 }] }),
  });
  console.log('close-no-reason', closeNoReason.status, errorCode(closeNoReason));
  if (closeNoReason.status !== 422) failed = true;

  const closeKey = randomUUID();
  const closeBody = {
    countedByMethod: [{ method: 'CASH', countedCents: 10000 }],
    differenceReason: 'faltou dinheiro no envelope do caixa',
  };
  const closed = await request(`/api/v1/cash-sessions/${sessionId}/close`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': closeKey }),
    },
    body: JSON.stringify(closeBody),
  });
  console.log('close', closed.status, dataOf(closed).status, dataOf(closed).differenceCents);
  if (closed.status !== 200) failed = true;
  if (dataOf(closed).status !== 'CLOSED') failed = true;
  if (dataOf(closed).differenceCents !== -3000) failed = true;

  const closeReplay = await request(`/api/v1/cash-sessions/${sessionId}/close`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': closeKey }),
    },
    body: JSON.stringify(closeBody),
  });
  console.log('close-replay', closeReplay.status);
  if (closeReplay.status !== 200) failed = true;
  if (dataOf(closeReplay).id !== sessionId) failed = true;

  const closeReused = await request(`/api/v1/cash-sessions/${sessionId}/close`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': closeKey }),
    },
    body: JSON.stringify({
      countedByMethod: [{ method: 'CASH', countedCents: 13000 }],
      differenceReason: 'faltou dinheiro no envelope do caixa',
    }),
  });
  console.log('close-key-reused', closeReused.status, errorCode(closeReused));
  if (closeReused.status !== 409 || errorCode(closeReused) !== 'IDEMPOTENCY_KEY_REUSED') failed = true;

  const closeAgain = await request(`/api/v1/cash-sessions/${sessionId}/close`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': randomUUID() }),
    },
    body: JSON.stringify(closeBody),
  });
  console.log('close-again', closeAgain.status, errorCode(closeAgain));
  if (closeAgain.status !== 423 || errorCode(closeAgain) !== 'RECORD_IMMUTABLE') failed = true;

  const movementClosed = await request(`/api/v1/cash-sessions/${sessionId}/movements`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      kind: 'SUPPLY',
      amountCents: 100,
      method: 'CASH',
      reason: 'tentativa depois de fechar o caixa',
    }),
  });
  console.log('movement-closed', movementClosed.status, errorCode(movementClosed));
  if (movementClosed.status !== 423 || errorCode(movementClosed) !== 'RECORD_IMMUTABLE') failed = true;

  const afterCloseCurrent = await request(`/api/v1/cash-sessions/current?unitId=${unitId}`, {
    headers: authHeaders(token, tenantId),
  });
  if (afterCloseCurrent.status !== 200 || afterCloseCurrent.body?.data !== null) failed = true;

  const patient = await request('/api/v1/patients', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Maria Caixa', phonePrimary: '62977772001', birthDate: '1990-01-15' }),
  });
  if (patient.status !== 201) failed = true;
  const patientId = (dataOf(patient).patient as { id: string }).id;

  const receivable = await request('/api/v1/receivables', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      patientId,
      unitId,
      totalCents: 20000,
      installmentCount: 2,
      firstDueDate: '2026-09-05',
    }),
  });
  if (receivable.status !== 201) failed = true;
  const installmentId = (dataOf(receivable).installments as Array<{ id: string }>)[0]?.id;
  const installmentOpen = (dataOf(receivable).installments as Array<{ id: string }>)[1]?.id;

  const opened2 = await request('/api/v1/cash-sessions', {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': randomUUID() }),
    },
    body: JSON.stringify({ unitId, openingCents: 0 }),
  });
  if (opened2.status !== 201) failed = true;
  const session2 = dataOf(opened2).id as string;

  const pay = await request(`/api/v1/installments/${installmentId}/payments`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': randomUUID() }),
    },
    body: JSON.stringify({ amountCents: 10000, splits: [{ method: 'CASH', amountCents: 10000 }] }),
  });
  console.log('pay-cash', pay.status);
  if (pay.status !== 201) failed = true;
  const paymentId = dataOf(pay).paymentId as string;

  const closed2 = await request(`/api/v1/cash-sessions/${session2}/close`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': randomUUID() }),
    },
    body: JSON.stringify({ countedByMethod: [{ method: 'CASH', countedCents: 10000 }] }),
  });
  console.log('close-balanced', closed2.status, dataOf(closed2).differenceCents);
  if (closed2.status !== 200) failed = true;
  if (dataOf(closed2).differenceCents !== 0) failed = true;

  const reverseClosed = await request(`/api/v1/payments/${paymentId}/reverse`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': randomUUID() }),
    },
    body: JSON.stringify({ reason: 'estorno depois de fechar o caixa' }),
  });
  console.log('reverse-closed', reverseClosed.status, errorCode(reverseClosed));
  if (reverseClosed.status !== 423 || errorCode(reverseClosed) !== 'RECORD_IMMUTABLE') failed = true;

  const cashNoSession = await request(`/api/v1/installments/${installmentOpen}/payments`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': randomUUID() }),
    },
    body: JSON.stringify({ amountCents: 1, splits: [{ method: 'CASH', amountCents: 1 }] }),
  });
  console.log('cash-after-close', cashNoSession.status, errorCode(cashNoSession));
  if (cashNoSession.status !== 422 || errorCode(cashNoSession) !== 'CASH_SESSION_REQUIRED') failed = true;

  await prisma.$disconnect();
  server.close();
  if (failed) {
    console.error('FAIL: billing cash smoke');
    process.exit(1);
  }
  console.log('OK: billing cash smoke');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
