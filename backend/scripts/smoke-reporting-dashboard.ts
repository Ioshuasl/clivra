import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { getPrismaClient, getTenantPrisma } from '../src/shared/database/tenant_prisma.js';
import { Role } from '../src/modules/identity/enum/role/role.enum.js';
import { hashToken } from '../src/shared/helpers/token_hash.js';
import { addDays } from '../src/modules/identity/helpers/slug.helper.js';

type Json = { status: number; body: Record<string, unknown> | null };
type ProcedureRow = { id: string; code: string; priceCents?: number };

async function main() {
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    process.env.NODE_ENV = 'test';
  }

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

  function isInt(value: unknown): boolean {
    return typeof value === 'number' && Number.isInteger(value);
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
      email: `s7-rep-${stamp}@example.com`,
      password,
      clinicName: 'Clinica Dashboard',
      ownerName: 'Owner Dashboard',
    }),
  });
  console.log('signup', signup.status);
  if (signup.status !== 201) failed = true;
  const token = dataOf(signup).accessToken as string;
  const tenantId = (dataOf(signup).tenant as { id: string }).id;
  const ownerUserId = (dataOf(signup).user as { id: string }).id;
  const membershipId = (dataOf(signup).membership as { id: string }).id;
  const smokeCtx = { tenantId, userId: ownerUserId, requestId: 'smoke-reporting-dashboard' };

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
    body: JSON.stringify({ membershipId, croNumber: '11111', croState: 'GO' }),
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
    body: JSON.stringify({ name: 'Maria Dashboard', phonePrimary: '62977773001', birthDate: '1990-01-15' }),
  });
  if (patient.status !== 201) failed = true;
  const patientId = (dataOf(patient).patient as { id: string }).id;

  if (unitId && ownerProfessionalId && patientId && res01) {
    const confirmedAt = new Date(`${today}T10:00:00-03:00`);
    const noShowAt = new Date(`${today}T08:00:00-03:00`);
    await tenantDb.runInTenantContext(smokeCtx, async (tx) => {
      await tx.appointment.create({
        data: {
          id: randomUUID(),
          tenantId,
          unitId,
          patientId,
          professionalId: ownerProfessionalId,
          procedureId: res01.id,
          startsAt: confirmedAt,
          endsAt: new Date(confirmedAt.getTime() + 30 * 60_000),
          status: 'CONFIRMED',
        },
      });
      await tx.appointment.create({
        data: {
          id: randomUUID(),
          tenantId,
          unitId,
          patientId,
          professionalId: ownerProfessionalId,
          procedureId: res01.id,
          startsAt: noShowAt,
          endsAt: new Date(noShowAt.getTime() + 30 * 60_000),
          status: 'NO_SHOW',
        },
      });
      await tx.productionEntry.create({
        data: {
          id: randomUUID(),
          tenantId,
          unitId,
          professionalId: ownerProfessionalId,
          patientId,
          procedureId: res01.id,
          amountCents: 15000n,
          executedAt: confirmedAt,
        },
      });
    });
  }

  const dueToday = await request('/api/v1/receivables', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      patientId,
      unitId,
      totalCents: 5000,
      installmentCount: 1,
      firstDueDate: today,
      description: 'A receber hoje smoke',
    }),
  });
  if (dueToday.status !== 201) failed = true;

  const paidTitle = await request('/api/v1/receivables', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      patientId,
      unitId,
      totalCents: 7000,
      installmentCount: 1,
      firstDueDate: today,
      description: 'Recebido hoje smoke',
    }),
  });
  if (paidTitle.status !== 201) failed = true;
  const paidInst = ((dataOf(paidTitle).installments as Array<{ id: string }>) ?? [])[0]?.id;

  const pay = await request(`/api/v1/installments/${paidInst}/payments`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, {
        'content-type': 'application/json',
        'Idempotency-Key': randomUUID(),
      }),
    },
    body: JSON.stringify({ amountCents: 7000, splits: [{ method: 'PIX', amountCents: 7000 }] }),
  });
  console.log('pay', pay.status);
  if (pay.status !== 201) failed = true;

  const dashboard = await request(`/api/v1/reports/dashboard?date=${today}`, {
    headers: authHeaders(token, tenantId),
  });
  const dash = dataOf(dashboard);
  const agenda = dash.agenda as { total?: number } | undefined;
  const receivableToday = dash.receivableToday as { count?: number; amountCents?: number } | null;
  const receivedToday = dash.receivedToday as { count?: number; amountCents?: number } | null;
  const noShowsMonth = dash.noShowsMonth as { count?: number } | undefined;
  const productionMonth = dash.productionMonth as { executedCents?: number } | undefined;
  console.log(
    'dashboard',
    dashboard.status,
    agenda?.total,
    receivableToday?.amountCents,
    receivedToday?.amountCents,
    noShowsMonth?.count,
    productionMonth?.executedCents,
  );
  if (dashboard.status !== 200) failed = true;
  if ((agenda?.total ?? 0) < 1) failed = true;
  if (!receivableToday || !isInt(receivableToday.amountCents) || receivableToday.amountCents < 5000) failed = true;
  if (!receivedToday || receivedToday.amountCents !== 7000) failed = true;
  if ((noShowsMonth?.count ?? 0) < 1) failed = true;
  if (productionMonth?.executedCents !== 15000) failed = true;
  if (!isInt(productionMonth?.executedCents)) failed = true;

  const noShows = await request(`/api/v1/reports/no-shows?from=${today.slice(0, 7)}-01&to=${today}`, {
    headers: authHeaders(token, tenantId),
  });
  const noShowData = dataOf(noShows);
  console.log('no-shows', noShows.status, noShowData.noShowCount, noShowData.estimatedLossCents);
  if (noShows.status !== 200) failed = true;
  if ((noShowData.noShowCount as number) < 1) failed = true;
  if (!isInt(noShowData.estimatedLossCents)) failed = true;

  const revenue = await request(`/api/v1/reports/revenue?from=${today}&to=${today}&groupBy=day`, {
    headers: authHeaders(token, tenantId),
  });
  console.log('revenue', revenue.status, dataOf(revenue).totalCents);
  if (revenue.status !== 200) failed = true;
  if (dataOf(revenue).totalCents !== 7000) failed = true;
  if (!isInt(dataOf(revenue).totalCents)) failed = true;

  const proceduresReport = await request(`/api/v1/reports/procedures?from=${today}&to=${today}`, {
    headers: authHeaders(token, tenantId),
  });
  const procItems = (dataOf(proceduresReport).items as Array<{ executedCents: number }>) ?? [];
  console.log('procedures', proceduresReport.status, procItems.length);
  if (proceduresReport.status !== 200) failed = true;
  if (!procItems.some((row) => row.executedCents === 15000 && isInt(row.executedCents))) failed = true;

  const tooLong = await request('/api/v1/reports/no-shows?from=2024-01-01&to=2026-08-17', {
    headers: authHeaders(token, tenantId),
  });
  console.log('period-too-long', tooLong.status, errorCode(tooLong));
  if (tooLong.status !== 422 || errorCode(tooLong) !== 'PERIOD_TOO_LONG') failed = true;

  const dentistEmail = `s7-rep-den-${stamp}@example.com`;
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
    body: JSON.stringify({ token: inviteToken, name: 'Dra Ana Dash', password }),
  });
  if (accept.status !== 200) failed = true;
  const dentistToken = dataOf(accept).accessToken as string;
  const dentistMembershipId =
    (dataOf(accept).membership as { id: string } | undefined)?.id ??
    (accept.body?.data as { membership?: { id: string } } | undefined)?.membership?.id;

  jar.clear();
  const dentistProf = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ membershipId: dentistMembershipId, croNumber: '22222', croState: 'GO' }),
  });
  if (dentistProf.status !== 201) failed = true;

  const dentistRevenue = await request(`/api/v1/reports/revenue?from=${today}&to=${today}`, {
    headers: authHeaders(dentistToken, tenantId),
  });
  console.log('dentist-revenue', dentistRevenue.status);
  if (dentistRevenue.status !== 403) failed = true;

  const dentistDash = await request(`/api/v1/reports/dashboard?date=${today}`, {
    headers: authHeaders(dentistToken, tenantId),
  });
  const dentistDashData = dataOf(dentistDash);
  console.log(
    'dentist-dashboard',
    dentistDash.status,
    dentistDashData.receivableToday,
    (dentistDashData.productionMonth as { executedCents?: number } | undefined)?.executedCents,
  );
  if (dentistDash.status !== 200) failed = true;
  if (dentistDashData.receivableToday !== null) failed = true;
  if ((dentistDashData.productionMonth as { executedCents?: number })?.executedCents !== 0) failed = true;

  const dentistOtherProc = await request(
    `/api/v1/reports/procedures?from=${today}&to=${today}&professionalId=${ownerProfessionalId}`,
    { headers: authHeaders(dentistToken, tenantId) },
  );
  console.log('dentist-other-procedures', dentistOtherProc.status);
  if (dentistOtherProc.status !== 403) failed = true;

  jar.clear();
  const other = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `s7-rep-b-${stamp}@example.com`,
      password,
      clinicName: 'Clinica Outro Tenant',
      ownerName: 'Owner B',
    }),
  });
  if (other.status !== 201) failed = true;
  const otherToken = dataOf(other).accessToken as string;
  const otherTenantId = (dataOf(other).tenant as { id: string }).id;
  const otherUserId = (dataOf(other).user as { id: string }).id;
  const otherMembershipId = (dataOf(other).membership as { id: string }).id;
  const otherUnits = await request('/api/v1/clinic/units', { headers: authHeaders(otherToken, otherTenantId) });
  const otherUnitId = ((otherUnits.body?.data as Array<{ id: string }>) ?? [])[0]?.id;
  const otherProf = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: { ...authHeaders(otherToken, otherTenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ membershipId: otherMembershipId, croNumber: '33333', croState: 'GO' }),
  });
  const otherProfessionalId = dataOf(otherProf).id as string;
  const otherPatient = await request('/api/v1/patients', {
    method: 'POST',
    headers: { ...authHeaders(otherToken, otherTenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Paciente B', phonePrimary: '62977773002' }),
  });
  const otherPatientId = (dataOf(otherPatient).patient as { id: string }).id;
  const otherProcs = await request('/api/v1/procedures', { headers: authHeaders(otherToken, otherTenantId) });
  const otherRes01 = ((otherProcs.body?.data as ProcedureRow[]) ?? []).find((row) => row.code === 'RES-01');
  if (otherUnitId && otherProfessionalId && otherPatientId && otherRes01) {
    await tenantDb.runInTenantContext(
      { tenantId: otherTenantId, userId: otherUserId, requestId: 'smoke-reporting-b' },
      (tx) =>
        tx.productionEntry.create({
          data: {
            id: randomUUID(),
            tenantId: otherTenantId,
            unitId: otherUnitId,
            professionalId: otherProfessionalId,
            patientId: otherPatientId,
            procedureId: otherRes01.id,
            amountCents: 99999n,
            executedAt: new Date(`${today}T11:00:00-03:00`),
          },
        }),
    );
  }

  jar.clear();
  const dashAgain = await request(`/api/v1/reports/dashboard?date=${today}`, {
    headers: authHeaders(token, tenantId),
  });
  const prodAgain = (dataOf(dashAgain).productionMonth as { executedCents?: number } | undefined)?.executedCents;
  console.log('cross-tenant', dashAgain.status, prodAgain);
  if (dashAgain.status !== 200 || prodAgain !== 15000) failed = true;

  await prisma.$disconnect();
  server.close();
  if (failed) {
    console.error('FAIL: reporting dashboard smoke');
    process.exit(1);
  }
  console.log('OK: reporting dashboard smoke');
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
