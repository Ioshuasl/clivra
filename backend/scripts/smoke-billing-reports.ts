import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { getPrismaClient, getTenantPrisma } from '../src/shared/database/tenant_prisma.js';
import { Role } from '../src/modules/identity/enum/role/role.enum.js';
import { hashToken } from '../src/shared/helpers/token_hash.js';
import { addDays } from '../src/modules/identity/helpers/slug.helper.js';
import { generateReceiptPdfJob } from '../src/modules/billing/jobs/generate_receipt_pdf.job.js';
import { resetObjectStorageForTests } from '../src/shared/storage/index.js';

type Json = { status: number; body: Record<string, unknown> | null };
type ProcedureRow = { id: string; code: string };

async function main() {
  process.env.STORAGE_FAKE = '1';
  resetObjectStorageForTests();

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

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const password = 'SenhaForte!99';
  const signup = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `s6-billing-rep-${stamp}@example.com`,
      password,
      clinicName: 'Clinica Relatorios',
      ownerName: 'Owner Relatorios',
    }),
  });
  console.log('signup', signup.status);
  if (signup.status !== 201) failed = true;
  const token = dataOf(signup).accessToken as string;
  const tenantId = (dataOf(signup).tenant as { id: string }).id;
  const ownerUserId = (dataOf(signup).user as { id: string }).id;
  const membershipId = (dataOf(signup).membership as { id: string }).id;
  const smokeCtx = { tenantId, userId: ownerUserId, requestId: 'smoke-billing-reports' };

  const clinica = await prisma.plan.findFirst({ where: { code: 'CLINICA' } });
  if (!clinica) failed = true;
  else {
    await tenantDb.runInTenantContext(smokeCtx, async (tx) => {
      await tx.subscription.update({
        where: { tenantId },
        data: { planId: clinica.id },
      });
    });
  }

  const units = await request('/api/v1/clinic/units', { headers: authHeaders(token, tenantId) });
  const unitId = ((units.body?.data as Array<{ id: string }>) ?? [])[0]?.id;
  if (!unitId) failed = true;

  const professional = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ membershipId, croNumber: '54321', croState: 'GO' }),
  });
  if (professional.status !== 201) failed = true;
  const ownerProfessionalId = dataOf(professional).id as string;

  const procedures = await request('/api/v1/procedures', { headers: authHeaders(token, tenantId) });
  const procedureList = (procedures.body?.data as ProcedureRow[]) ?? [];
  const res01 = procedureList.find((row) => row.code === 'RES-01');
  if (!res01) failed = true;

  const patient = await request('/api/v1/patients', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Maria Relatorios', phonePrimary: '62977772001', birthDate: '1990-01-15' }),
  });
  if (patient.status !== 201) failed = true;
  const patientId = (dataOf(patient).patient as { id: string }).id;

  const future = await request('/api/v1/receivables', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      patientId,
      unitId,
      totalCents: 10000,
      installmentCount: 1,
      firstDueDate: '2026-09-05',
      description: 'Parcela futura smoke',
    }),
  });
  if (future.status !== 201) failed = true;
  const futureInst = ((dataOf(future).installments as Array<{ id: string }>) ?? [])[0]?.id;

  const overdueTitle = await request('/api/v1/receivables', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      patientId,
      unitId,
      totalCents: 8000,
      installmentCount: 1,
      firstDueDate: '2026-07-01',
      description: 'Parcela vencida smoke',
    }),
  });
  if (overdueTitle.status !== 201) failed = true;
  const overdueInst = ((dataOf(overdueTitle).installments as Array<{ id: string }>) ?? [])[0]?.id;

  const openCash = await request('/api/v1/cash-sessions', {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, {
        'content-type': 'application/json',
        'Idempotency-Key': randomUUID(),
      }),
    },
    body: JSON.stringify({ unitId, openingCents: 0 }),
  });
  console.log('cash-open', openCash.status);
  if (openCash.status !== 201) failed = true;

  const pay = await request(`/api/v1/installments/${futureInst}/payments`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, {
        'content-type': 'application/json',
        'Idempotency-Key': randomUUID(),
      }),
    },
    body: JSON.stringify({ amountCents: 10000, splits: [{ method: 'PIX', amountCents: 10000 }] }),
  });
  console.log('pay-pix', pay.status);
  if (pay.status !== 201) failed = true;
  const paymentId = dataOf(pay).paymentId as string;

  const pending = await request(`/api/v1/payments/${paymentId}/receipt`, {
    headers: authHeaders(token, tenantId),
  });
  console.log('receipt-pending', pending.status, errorCode(pending));
  if (pending.status !== 409 || errorCode(pending) !== 'PDF_PENDING') failed = true;

  await generateReceiptPdfJob({ tenantId, requestId: 'smoke-receipt-pdf', paymentId });

  const ready = await request(`/api/v1/payments/${paymentId}/receipt`, {
    headers: authHeaders(token, tenantId),
  });
  console.log('receipt-ready', ready.status, Boolean(dataOf(ready).url));
  if (ready.status !== 200) failed = true;
  if (typeof dataOf(ready).url !== 'string') failed = true;
  if (dataOf(ready).expiresIn !== 900) failed = true;

  const sendCopy = await request(`/api/v1/payments/${paymentId}/send-receipt`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ channel: 'WHATSAPP' }),
  });
  console.log('send-receipt', sendCopy.status, dataOf(sendCopy).sentVia);
  if (sendCopy.status !== 200) failed = true;
  if (dataOf(sendCopy).sentVia !== 'COPY') failed = true;
  if (typeof dataOf(sendCopy).copyText !== 'string') failed = true;

  const cashFlowCash = await request(
    `/api/v1/reports/cash-flow?from=${today}&to=${today}&basis=CASH&unitId=${unitId}`,
    { headers: authHeaders(token, tenantId) },
  );
  const cashFlowAccrual = await request(
    `/api/v1/reports/cash-flow?from=${today}&to=${today}&basis=ACCRUAL&unitId=${unitId}`,
    { headers: authHeaders(token, tenantId) },
  );
  const cashIn = dataOf(cashFlowCash).inflowsCents as number;
  const accIn = dataOf(cashFlowAccrual).inflowsCents as number;
  console.log('cash-flow', cashFlowCash.status, cashIn, cashFlowAccrual.status, accIn);
  if (cashFlowCash.status !== 200 || cashFlowAccrual.status !== 200) failed = true;
  if (cashIn !== 10000) failed = true;
  if (accIn === cashIn) failed = true;

  const overdue = await request('/api/v1/reports/overdue', { headers: authHeaders(token, tenantId) });
  const buckets = (dataOf(overdue).buckets as Array<{ band: string; count: number; totalCents: number }>) ?? [];
  const withItems = buckets.filter((row) => row.count > 0);
  console.log('overdue', overdue.status, withItems.map((row) => row.band).join(','));
  if (overdue.status !== 200) failed = true;
  if (!buckets.some((row) => row.band === '31_60' && row.count >= 1 && row.totalCents >= 8000)) {
    failed = true;
  }

  const chargeOk = await request(`/api/v1/installments/${overdueInst}/charge`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ channel: 'COPY' }),
  });
  console.log('charge-overdue', chargeOk.status, dataOf(chargeOk).sentVia);
  if (chargeOk.status !== 200 || dataOf(chargeOk).sentVia !== 'COPY') failed = true;

  const chargeFuture = await request(`/api/v1/installments/${futureInst}/charge`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ channel: 'COPY' }),
  });
  console.log('charge-future', chargeFuture.status, errorCode(chargeFuture));
  if (chargeFuture.status !== 422) failed = true;

  if (res01 && ownerProfessionalId && unitId && patientId) {
    await tenantDb.runInTenantContext(smokeCtx, (tx) =>
      tx.productionEntry.create({
        data: {
          id: randomUUID(),
          tenantId,
          unitId,
          professionalId: ownerProfessionalId,
          patientId,
          procedureId: res01.id,
          amountCents: 15000n,
          executedAt: new Date(),
        },
      }),
    );
  }

  const productionOwner = await request(
    `/api/v1/reports/production?from=${today}&to=${today}`,
    { headers: authHeaders(token, tenantId) },
  );
  const ownerItems = (dataOf(productionOwner).items as Array<{ professionalId: string; executedCents: number }>) ?? [];
  console.log('production-owner', productionOwner.status, ownerItems.length);
  if (productionOwner.status !== 200) failed = true;
  if (!ownerItems.some((row) => row.professionalId === ownerProfessionalId && row.executedCents === 15000)) {
    failed = true;
  }

  const dentistEmail = `s6-rep-den-${stamp}@example.com`;
  const invite = await request('/api/v1/users/invitations', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ email: dentistEmail, role: Role.DENTIST }),
  });
  if (invite.status !== 201) failed = true;
  const inviteId = dataOf(invite).id as string;
  const inviteToken = `rep-den-${stamp}`;
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
    body: JSON.stringify({ token: inviteToken, name: 'Dra Ana Rel', password }),
  });
  if (accept.status !== 200) failed = true;
  const dentistToken = dataOf(accept).accessToken as string;
  const dentistMembershipId = (dataOf(accept).membership as { id: string } | undefined)?.id
    ?? (accept.body?.data as { membership?: { id: string } } | undefined)?.membership?.id;

  jar.clear();
  const dentistProf = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ membershipId: dentistMembershipId, croNumber: '99999', croState: 'GO' }),
  });
  console.log('dentist-professional', dentistProf.status, dentistMembershipId);
  if (dentistProf.status !== 201) failed = true;
  const dentistProfessionalId = dataOf(dentistProf).id as string;

  const dentistCashFlow = await request(
    `/api/v1/reports/cash-flow?from=${today}&to=${today}&basis=CASH`,
    { headers: authHeaders(dentistToken, tenantId) },
  );
  console.log('dentist-cash-flow', dentistCashFlow.status);
  if (dentistCashFlow.status !== 403) failed = true;

  const dentistOther = await request(
    `/api/v1/reports/production?from=${today}&to=${today}&professionalId=${ownerProfessionalId}`,
    { headers: authHeaders(dentistToken, tenantId) },
  );
  console.log('dentist-other-prod', dentistOther.status);
  if (dentistOther.status !== 403) failed = true;

  const dentistOwn = await request(
    `/api/v1/reports/production?from=${today}&to=${today}`,
    { headers: authHeaders(dentistToken, tenantId) },
  );
  const dentistItems = (dataOf(dentistOwn).items as Array<{ professionalId: string }>) ?? [];
  console.log('dentist-own-prod', dentistOwn.status, dentistItems.length);
  if (dentistOwn.status !== 200) failed = true;
  if (dentistItems.some((row) => row.professionalId === ownerProfessionalId)) failed = true;

  const receptionEmail = `s6-rep-rec-${stamp}@example.com`;
  jar.clear();
  const recInvite = await request('/api/v1/users/invitations', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ email: receptionEmail, role: Role.RECEPTION }),
  });
  if (recInvite.status !== 201) failed = true;
  const recInviteId = dataOf(recInvite).id as string;
  const recTokenRaw = `rep-rec-${stamp}`;
  await tenantDb.runInTenantContext(smokeCtx, async (tx) => {
    await tx.invitation.update({
      where: { id: recInviteId },
      data: { tokenHash: hashToken(recTokenRaw), expiresAt: addDays(new Date(), 7) },
    });
  });
  jar.clear();
  const recAccept = await request('/api/v1/users/invitations/accept', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: recTokenRaw, name: 'Recepcionista', password }),
  });
  if (recAccept.status !== 200) failed = true;
  const receptionToken = dataOf(recAccept).accessToken as string;
  const recCash = await request(
    `/api/v1/reports/cash-flow?from=${today}&to=${today}&basis=CASH`,
    { headers: authHeaders(receptionToken, tenantId) },
  );
  console.log('reception-cash-flow', recCash.status);
  if (recCash.status !== 403) failed = true;

  void dentistProfessionalId;

  await prisma.$disconnect();
  server.close();
  if (failed) {
    console.error('FAIL: billing reports smoke');
    process.exit(1);
  }
  console.log('OK: billing reports smoke');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
