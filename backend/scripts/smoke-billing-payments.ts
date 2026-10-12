import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { getPrismaClient, getTenantPrisma } from '../src/shared/database/tenant_prisma.js';
import { Role } from '../src/modules/identity/enum/role/role.enum.js';
import { hashToken } from '../src/shared/helpers/token_hash.js';
import { addDays } from '../src/modules/identity/helpers/slug.helper.js';

type Json = { status: number; body: Record<string, unknown> | null };

async function main() {
  const app = createApp();
  const server = app.listen(0) as Server;
  await once(server, 'listening');
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('no port');
  const origin = `http://127.0.0.1:${addr.port}`;
  const stamp = Date.now();
  let failed = false;

  const jar = new Map<string, string>();
  const prisma = getPrismaClient();
  const tenantDb = getTenantPrisma();

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
  const signup = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `s6-billing-pay-${stamp}@example.com`,
      password,
      clinicName: 'Clinica Baixa',
      ownerName: 'Owner Baixa',
    }),
  });
  console.log('signup', signup.status);
  if (signup.status !== 201) failed = true;
  const token = dataOf(signup).accessToken as string;
  const tenantId = (dataOf(signup).tenant as { id: string }).id;
  const ownerUserId = (dataOf(signup).user as { id: string }).id;
  const smokeCtx = { tenantId, userId: ownerUserId, requestId: 'smoke-billing-payments' };

  const units = await request('/api/v1/clinic/units', { headers: authHeaders(token, tenantId) });
  const unitId = ((units.body?.data as Array<{ id: string }>) ?? [])[0]?.id;
  if (!unitId) failed = true;

  const patient = await request('/api/v1/patients', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Maria Baixa', phonePrimary: '62977771001', birthDate: '1990-01-15' }),
  });
  if (patient.status !== 201) failed = true;
  const patientId = (dataOf(patient).patient as { id: string }).id;

  const created = await request('/api/v1/receivables', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      patientId,
      unitId,
      totalCents: 30000,
      installmentCount: 3,
      firstDueDate: '2026-09-05',
      description: 'Título manual smoke',
    }),
  });
  console.log('receivable-create', created.status);
  if (created.status !== 201) failed = true;
  const receivableId = dataOf(created).id as string;
  const installments = (dataOf(created).installments as Array<{ id: string; amountCents: number }>) ?? [];
  if (installments.length !== 3) failed = true;
  const sum = installments.reduce((acc, row) => acc + row.amountCents, 0);
  if (sum !== 30000) failed = true;
  const inst1 = installments[0]?.id;
  const inst2 = installments[1]?.id;
  const inst3 = installments[2]?.id;

  const emptyTitle = await request('/api/v1/receivables', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      patientId,
      unitId,
      totalCents: 5000,
      installmentCount: 1,
      firstDueDate: '2026-10-01',
    }),
  });
  if (emptyTitle.status !== 201) failed = true;
  const emptyId = dataOf(emptyTitle).id as string;

  const listed = await request(`/api/v1/receivables?patientId=${patientId}`, {
    headers: authHeaders(token, tenantId),
  });
  console.log('receivable-list', listed.status);
  if (listed.status !== 200) failed = true;

  const detail = await request(`/api/v1/receivables/${receivableId}`, {
    headers: authHeaders(token, tenantId),
  });
  if (detail.status !== 200) failed = true;

  const instList = await request(`/api/v1/installments?patientId=${patientId}`, {
    headers: authHeaders(token, tenantId),
  });
  console.log('installment-list', instList.status);
  if (instList.status !== 200) failed = true;

  const cashBody = {
    amountCents: 10000,
    notes: null,
    splits: [{ method: 'CASH', amountCents: 10000 }],
  };
  const cashNoSession = await request(`/api/v1/installments/${inst1}/payments`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': randomUUID() }),
    },
    body: JSON.stringify(cashBody),
  });
  console.log('cash-no-session', cashNoSession.status, errorCode(cashNoSession));
  if (cashNoSession.status !== 422 || errorCode(cashNoSession) !== 'CASH_SESSION_REQUIRED') failed = true;

  const sessionId = randomUUID();
  await tenantDb.runInTenantContext(smokeCtx, async (tx) => {
    await tx.cashSession.create({
      data: {
        id: sessionId,
        tenantId,
        unitId: unitId!,
        openedBy: ownerUserId,
        openingCents: BigInt(0),
        status: 'OPEN',
      },
    });
  });

  const key1 = randomUUID();
  const pixCashBody = {
    amountCents: 10000,
    splits: [
      { method: 'PIX', amountCents: 7000 },
      { method: 'CASH', amountCents: 3000 },
    ],
  };
  const pay1 = await request(`/api/v1/installments/${inst1}/payments`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': key1 }),
    },
    body: JSON.stringify(pixCashBody),
  });
  console.log('pay-pix-cash', pay1.status, dataOf(pay1));
  if (pay1.status !== 201) failed = true;
  if (dataOf(pay1).installmentStatus !== 'PAID') failed = true;
  const paymentId = dataOf(pay1).paymentId as string;
  const receiptNumber = dataOf(pay1).receiptNumber as number;

  const replay = await request(`/api/v1/installments/${inst1}/payments`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': key1 }),
    },
    body: JSON.stringify(pixCashBody),
  });
  console.log('pay-replay', replay.status);
  if (replay.status !== 201) failed = true;
  if (dataOf(replay).paymentId !== paymentId) failed = true;
  if (dataOf(replay).receiptNumber !== receiptNumber) failed = true;

  const reused = await request(`/api/v1/installments/${inst1}/payments`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': key1 }),
    },
    body: JSON.stringify({ amountCents: 1000, splits: [{ method: 'PIX', amountCents: 1000 }] }),
  });
  console.log('pay-key-reused', reused.status, errorCode(reused));
  if (reused.status !== 409 || errorCode(reused) !== 'IDEMPOTENCY_KEY_REUSED') failed = true;

  const partial = await request(`/api/v1/installments/${inst2}/payments`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, {
        'content-type': 'application/json',
        'Idempotency-Key': randomUUID(),
      }),
    },
    body: JSON.stringify({ amountCents: 4000, splits: [{ method: 'PIX', amountCents: 4000 }] }),
  });
  console.log('pay-partial', partial.status, dataOf(partial).installmentStatus);
  if (partial.status !== 201) failed = true;
  if (dataOf(partial).installmentStatus !== 'PARTIALLY_PAID') failed = true;

  const excess = await request(`/api/v1/installments/${inst2}/payments`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, {
        'content-type': 'application/json',
        'Idempotency-Key': randomUUID(),
      }),
    },
    body: JSON.stringify({ amountCents: 7000, splits: [{ method: 'PIX', amountCents: 7000 }] }),
  });
  console.log('pay-excess', excess.status, dataOf(excess).creditCentsGranted);
  if (excess.status !== 201) failed = true;
  if (dataOf(excess).creditCentsGranted !== 1000) failed = true;
  if (dataOf(excess).installmentStatus !== 'PAID') failed = true;

  const credit = await request(`/api/v1/patients/${patientId}/credit`, {
    headers: authHeaders(token, tenantId),
  });
  console.log('credit', credit.status, dataOf(credit).balanceCents);
  if (credit.status !== 200) failed = true;
  if (dataOf(credit).balanceCents !== 1000) failed = true;

  const useCredit = await request(`/api/v1/installments/${inst3}/payments`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, {
        'content-type': 'application/json',
        'Idempotency-Key': randomUUID(),
      }),
    },
    body: JSON.stringify({
      amountCents: 10000,
      splits: [
        { method: 'PATIENT_CREDIT', amountCents: 1000 },
        { method: 'PIX', amountCents: 9000 },
      ],
    }),
  });
  console.log('pay-credit', useCredit.status, dataOf(useCredit).installmentStatus);
  if (useCredit.status !== 201) failed = true;
  const creditAfter = await request(`/api/v1/patients/${patientId}/credit`, {
    headers: authHeaders(token, tenantId),
  });
  if (dataOf(creditAfter).balanceCents !== 0) failed = true;

  const reverseOpen = await request(`/api/v1/payments/${paymentId}/reverse`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, {
        'content-type': 'application/json',
        'Idempotency-Key': randomUUID(),
      }),
    },
    body: JSON.stringify({ reason: 'lançado na parcela errada' }),
  });
  console.log('reverse-open', reverseOpen.status);
  if (reverseOpen.status !== 200) failed = true;

  const cancelWithPay = await request(`/api/v1/receivables/${receivableId}/cancel`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ reason: 'ainda tem pagamentos ativos' }),
  });
  console.log('cancel-has-payments', cancelWithPay.status, errorCode(cancelWithPay));
  if (cancelWithPay.status !== 422 || errorCode(cancelWithPay) !== 'RECEIVABLE_HAS_PAYMENTS') failed = true;

  const cancelEmpty = await request(`/api/v1/receivables/${emptyId}/cancel`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ reason: 'título lançado por engano' }),
  });
  console.log('cancel-empty', cancelEmpty.status);
  if (cancelEmpty.status !== 200) failed = true;

  const payClosed = await request(`/api/v1/installments/${inst1}/payments`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, {
        'content-type': 'application/json',
        'Idempotency-Key': randomUUID(),
      }),
    },
    body: JSON.stringify(pixCashBody),
  });
  if (payClosed.status !== 201) failed = true;
  const closedPaymentId = dataOf(payClosed).paymentId as string;
  await tenantDb.runInTenantContext(smokeCtx, async (tx) => {
    await tx.cashSession.update({
      where: { id: sessionId },
      data: { status: 'CLOSED', closedAt: new Date(), closedBy: ownerUserId },
    });
  });
  const reverseClosed = await request(`/api/v1/payments/${closedPaymentId}/reverse`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, {
        'content-type': 'application/json',
        'Idempotency-Key': randomUUID(),
      }),
    },
    body: JSON.stringify({ reason: 'tentativa após fechar o caixa' }),
  });
  console.log('reverse-closed', reverseClosed.status, errorCode(reverseClosed));
  if (reverseClosed.status !== 423 || errorCode(reverseClosed) !== 'RECORD_IMMUTABLE') failed = true;

  const dentistEmail = `s6-dent-${stamp}@example.com`;
  const invite = await request('/api/v1/users/invitations', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ email: dentistEmail, role: Role.DENTIST }),
  });
  if (invite.status !== 201) failed = true;
  const inviteId = dataOf(invite).id as string;
  const inviteToken = `bill-den-${stamp}`;
  await tenantDb.runInTenantContext(smokeCtx, async (tx) => {
    await tx.invitation.update({
      where: { id: inviteId },
      data: { tokenHash: hashToken(inviteToken), expiresAt: addDays(new Date(), 7) },
    });
  });
  jar.clear();
  const accept = await request('/api/v1/users/invitations/accept', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: inviteToken, name: 'Dra Ana', password }),
  });
  if (accept.status !== 200) failed = true;
  const dentistToken = dataOf(accept).accessToken as string;
  const dentistPay = await request(`/api/v1/installments/${inst3}/payments`, {
    method: 'POST',
    headers: {
      ...authHeaders(dentistToken, tenantId, {
        'content-type': 'application/json',
        'Idempotency-Key': randomUUID(),
      }),
    },
    body: JSON.stringify({ amountCents: 1000, splits: [{ method: 'PIX', amountCents: 1000 }] }),
  });
  console.log('dentist-pay', dentistPay.status, errorCode(dentistPay));
  if (dentistPay.status !== 403) failed = true;

  await prisma.$disconnect();
  server.close();
  if (failed) {
    console.error('FAIL: billing payments smoke');
    process.exit(1);
  }
  console.log('OK: billing payments smoke');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
