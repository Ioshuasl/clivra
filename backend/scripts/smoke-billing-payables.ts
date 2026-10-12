import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { getPrismaClient, getTenantPrisma } from '../src/shared/database/tenant_prisma.js';
import { Role } from '../src/modules/identity/enum/role/role.enum.js';
import { hashToken } from '../src/shared/helpers/token_hash.js';
import { addDays } from '../src/modules/identity/helpers/slug.helper.js';
import { MarkOverdueService } from '../src/modules/billing/services/installment/installment_mark_overdue.service.js';

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
  const stamp = Date.now();
  const signup = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `s6-billing-ap-${stamp}@example.com`,
      password,
      clinicName: 'Clinica AP',
      ownerName: 'Owner AP',
    }),
  });
  console.log('signup', signup.status);
  if (signup.status !== 201) failed = true;
  const token = dataOf(signup).accessToken as string;
  const tenantId = (dataOf(signup).tenant as { id: string }).id;
  const ownerUserId = (dataOf(signup).user as { id: string }).id;
  const smokeCtx = { tenantId, userId: ownerUserId, requestId: 'smoke-billing-payables' };

  const units = await request('/api/v1/clinic/units', { headers: authHeaders(token, tenantId) });
  const unitId = ((units.body?.data as Array<{ id: string }>) ?? [])[0]?.id;
  if (!unitId) failed = true;

  const cats = await request('/api/v1/financial-categories?kind=EXPENSE', {
    headers: authHeaders(token, tenantId),
  });
  console.log('categories', cats.status, Array.isArray(cats.body?.data) ? (cats.body?.data as unknown[]).length : 0);
  if (cats.status !== 200) failed = true;
  const expenseCats = (cats.body?.data as Array<{ id: string; name: string }>) ?? [];
  const rent = expenseCats.find((row) => row.name === 'Aluguel e condomínio');
  if (!rent) failed = true;

  const createdCat = await request('/api/v1/financial-categories', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ name: `Taxa extra ${stamp}`, kind: 'EXPENSE' }),
  });
  console.log('category-create', createdCat.status);
  if (createdCat.status !== 201) failed = true;

  const dupCat = await request('/api/v1/financial-categories', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ name: `Taxa extra ${stamp}`, kind: 'EXPENSE' }),
  });
  console.log('category-dup', dupCat.status, errorCode(dupCat));
  if (dupCat.status !== 409) failed = true;

  const payable = await request('/api/v1/payables', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      unitId,
      categoryId: rent?.id,
      description: 'Aluguel agosto',
      amountCents: 250000,
      dueDate: '2026-08-10',
      supplier: 'Imobiliaria Centro',
      recurrence: { frequency: 'MONTHLY', until: '2027-12-31' },
    }),
  });
  console.log('payable-create', payable.status);
  if (payable.status !== 201) failed = true;
  const payableId = dataOf(payable).id as string;

  const patched = await request(`/api/v1/payables/${payableId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ description: 'Aluguel agosto (ajustado)' }),
  });
  console.log('payable-patch', patched.status);
  if (patched.status !== 200) failed = true;

  const cashPay = await request(`/api/v1/payables/${payableId}/pay`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': randomUUID() }),
    },
    body: JSON.stringify({ method: 'CASH' }),
  });
  console.log('pay-cash-no-session', cashPay.status, errorCode(cashPay));
  if (cashPay.status !== 422 || errorCode(cashPay) !== 'CASH_SESSION_REQUIRED') failed = true;

  const opened = await request('/api/v1/cash-sessions', {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': randomUUID() }),
    },
    body: JSON.stringify({ unitId, openingCents: 0 }),
  });
  if (opened.status !== 201) failed = true;

  const payKey = randomUUID();
  const paid = await request(`/api/v1/payables/${payableId}/pay`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': payKey }),
    },
    body: JSON.stringify({ method: 'PIX' }),
  });
  console.log('payable-pay', paid.status, dataOf(paid));
  if (paid.status !== 200) failed = true;
  if (dataOf(paid).status !== 'PAID') failed = true;
  if (!dataOf(paid).spawnedPayableId) failed = true;
  const spawnedId = dataOf(paid).spawnedPayableId as string;

  const replay = await request(`/api/v1/payables/${payableId}/pay`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, { 'content-type': 'application/json', 'Idempotency-Key': payKey }),
    },
    body: JSON.stringify({ method: 'PIX' }),
  });
  console.log('payable-pay-replay', replay.status);
  if (replay.status !== 200) failed = true;
  if (dataOf(replay).payableId !== payableId) failed = true;

  const spawned = await request(`/api/v1/payables/${spawnedId}`, {
    headers: authHeaders(token, tenantId),
  });
  console.log('spawned', spawned.status, dataOf(spawned).dueDate, dataOf(spawned).status);
  if (spawned.status !== 200) failed = true;
  if (dataOf(spawned).dueDate !== '2026-09-10') failed = true;
  if (dataOf(spawned).status !== 'OPEN') failed = true;

  const patchPaid = await request(`/api/v1/payables/${payableId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ description: 'nao pode' }),
  });
  console.log('patch-paid', patchPaid.status);
  if (patchPaid.status !== 422) failed = true;

  const patient = await request('/api/v1/patients', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Maria Atraso', phonePrimary: '62977773001', birthDate: '1990-01-15' }),
  });
  if (patient.status !== 201) failed = true;
  const patientId = (dataOf(patient).patient as { id: string }).id;

  const overdueTitle = await request('/api/v1/receivables', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      patientId,
      unitId,
      totalCents: 8000,
      installmentCount: 1,
      firstDueDate: '2020-01-15',
    }),
  });
  if (overdueTitle.status !== 201) failed = true;

  const listedOverdue = await request(`/api/v1/installments?patientId=${patientId}&status=OVERDUE`, {
    headers: authHeaders(token, tenantId),
  });
  const overdueItems = (listedOverdue.body?.data as Array<{ status: string }>) ?? [];
  console.log('installment-overdue-list', listedOverdue.status, overdueItems[0]?.status);
  if (listedOverdue.status !== 200) failed = true;
  if (overdueItems[0]?.status !== 'OVERDUE') failed = true;

  const marked = await new MarkOverdueService().execute(smokeCtx);
  console.log('mark-overdue-job', marked);
  if (marked < 1) failed = true;

  const patientGet = await request(`/api/v1/patients/${patientId}`, {
    headers: authHeaders(token, tenantId),
  });
  const patientData = (patientGet.body?.data as { patient?: { hasOverdue?: boolean } } | { hasOverdue?: boolean }) ?? {};
  const hasOverdueFlag =
    'patient' in patientData && patientData.patient
      ? patientData.patient.hasOverdue
      : (patientData as { hasOverdue?: boolean }).hasOverdue;
  console.log('patient-has-overdue', patientGet.status, hasOverdueFlag);
  if (patientGet.status !== 200) failed = true;
  if (hasOverdueFlag !== true) failed = true;

  const dentistEmail = `s6-ap-den-${stamp}@example.com`;
  const invite = await request('/api/v1/users/invitations', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ email: dentistEmail, role: Role.DENTIST }),
  });
  if (invite.status !== 201) failed = true;
  const inviteId = dataOf(invite).id as string;
  const inviteToken = `ap-den-${stamp}`;
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
  const dentistPatient = await request(`/api/v1/patients/${patientId}`, {
    headers: authHeaders(dentistToken, tenantId),
  });
  const dentistBody = dentistPatient.body?.data as { patient?: { hasOverdue?: boolean }; hasOverdue?: boolean };
  const dentistFlag = dentistBody?.patient?.hasOverdue ?? dentistBody?.hasOverdue;
  console.log('dentist-has-overdue', dentistPatient.status, dentistFlag);
  if (dentistPatient.status !== 200) failed = true;
  if (dentistFlag !== undefined) failed = true;

  await prisma.$disconnect();
  server.close();
  if (failed) {
    console.error('FAIL: billing payables smoke');
    process.exit(1);
  }
  console.log('OK: billing payables smoke');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
