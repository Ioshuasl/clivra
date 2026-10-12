import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { getPrismaClient, getTenantPrisma } from '../src/shared/database/tenant_prisma.js';
import { Role } from '../src/modules/identity/enum/role/role.enum.js';
import { hashToken } from '../src/shared/helpers/token_hash.js';
import { addDays } from '../src/modules/identity/helpers/slug.helper.js';
import { closeReportCache } from '../src/modules/reporting/helpers/report_cache.helper.js';
import { PLAN_IDS } from '../src/modules/subscription/enum/plan/plan_code.enum.js';

type Json = { status: number; body: Record<string, unknown> | null };
type ProcedureRow = { id: string; code: string; priceCents?: number };

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
      email: `s7-rep-dash-${stamp}@example.com`,
      password,
      clinicName: 'Clinica Dashboard S7',
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

  const units = await request('/api/v1/clinic/units', { headers: authHeaders(token, tenantId) });
  const unitId = ((units.body?.data as Array<{ id: string }>) ?? [])[0]?.id;
  if (!unitId) failed = true;

  const professional = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ membershipId, croNumber: '77771', croState: 'GO' }),
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
    body: JSON.stringify({
      name: 'Paciente Dashboard',
      phonePrimary: '62977773001',
      birthDate: '1991-02-10',
    }),
  });
  if (patient.status !== 201) failed = true;
  const patientId = (dataOf(patient).patient as { id: string }).id;

  const startsAt = new Date(`${today}T14:00:00-03:00`);
  const endsAt = new Date(startsAt.getTime() + 40 * 60_000);
  if (unitId && patientId && ownerProfessionalId) {
    await tenantDb.runInTenantContext(smokeCtx, (tx) =>
      tx.appointment.create({
        data: {
          id: randomUUID(),
          tenantId,
          unitId,
          patientId,
          professionalId: ownerProfessionalId,
          procedureId: res01?.id,
          startsAt,
          endsAt,
          status: 'CONFIRMED',
        },
      }),
    );
  }
  console.log('appt-confirmed-seeded');
  // NO_SHOW via Prisma no dia civil (TZ SP); regra HTTP exige startsAt no passado
  let noShowStartsAt = new Date(`${today}T08:00:00-03:00`);
  if (noShowStartsAt.getTime() > Date.now()) {
    noShowStartsAt = new Date(Date.now() - 60_000);
  }
  const noShowEndsAt = new Date(noShowStartsAt.getTime() + 40 * 60_000);
  if (unitId && patientId && ownerProfessionalId) {
    await tenantDb.runInTenantContext(smokeCtx, (tx) =>
      tx.appointment.create({
        data: {
          id: randomUUID(),
          tenantId,
          unitId,
          patientId,
          professionalId: ownerProfessionalId,
          procedureId: res01?.id,
          startsAt: noShowStartsAt,
          endsAt: noShowEndsAt,
          status: 'NO_SHOW',
        },
      }),
    );
  }
  console.log('no-show-seeded', noShowStartsAt.toISOString());

  const receivable = await request('/api/v1/receivables', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      patientId,
      unitId,
      totalCents: 4500,
      installmentCount: 1,
      firstDueDate: today,
      description: 'A receber hoje smoke',
    }),
  });
  console.log('receivable-today', receivable.status);
  if (receivable.status !== 201) failed = true;

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
          amountCents: 12_500n,
          executedAt: new Date(),
        },
      }),
    );
  }

  const dashboard = await request(`/api/v1/reports/dashboard?date=${today}`, {
    headers: authHeaders(token, tenantId),
  });
  const dash = dataOf(dashboard);
  console.log(
    'dashboard',
    dashboard.status,
    dash.agendaByStatus,
    dash.receivableTodayCents,
    dash.noShowsMonthCount,
    dash.productionMonthCents,
  );
  if (dashboard.status !== 200) failed = true;
  const agenda = (dash.agendaByStatus as Record<string, number>) ?? {};
  if ((agenda.CONFIRMED ?? 0) < 1) failed = true;
  if ((dash.receivableTodayCents as number) < 4500) failed = true;
  if ((dash.receivableTodayCount as number) < 1) failed = true;
  if ((dash.noShowsMonthCount as number) < 1) failed = true;
  if ((dash.productionMonthCents as number) < 12_500) failed = true;
  if (typeof dash.timezone !== 'string') failed = true;

  const noShows = await request(
    `/api/v1/reports/no-shows?from=${today}&to=${today}`,
    { headers: authHeaders(token, tenantId) },
  );
  console.log('no-shows', noShows.status, dataOf(noShows).noShowCount);
  if (noShows.status !== 200) failed = true;
  if ((dataOf(noShows).noShowCount as number) < 1) failed = true;

  const revenue = await request(
    `/api/v1/reports/revenue?from=${today}&to=${today}&groupBy=day`,
    { headers: authHeaders(token, tenantId) },
  );
  console.log('revenue', revenue.status, dataOf(revenue).totalCents);
  if (revenue.status !== 200) failed = true;

  const proceduresReport = await request(
    `/api/v1/reports/procedures?from=${today}&to=${today}`,
    { headers: authHeaders(token, tenantId) },
  );
  const procItems =
    (dataOf(proceduresReport).items as Array<{ procedureId: string; totalCents: number }>) ?? [];
  console.log('procedures', proceduresReport.status, procItems.length);
  if (proceduresReport.status !== 200) failed = true;
  if (!procItems.some((row) => row.procedureId === res01?.id && row.totalCents >= 12_500)) {
    failed = true;
  }

  const tooLong = await request(
    `/api/v1/reports/procedures?from=2024-01-01&to=2026-12-31`,
    { headers: authHeaders(token, tenantId) },
  );
  console.log('period-cap', tooLong.status, errorCode(tooLong));
  if (tooLong.status !== 422) failed = true;

  // cash-flow billing ainda vivo
  const cashFlow = await request(
    `/api/v1/reports/cash-flow?from=${today}&to=${today}&basis=CASH`,
    { headers: authHeaders(token, tenantId) },
  );
  console.log('billing-cash-flow-still', cashFlow.status);
  if (cashFlow.status !== 200) failed = true;

  const dentistEmail = `s7-rep-den-${stamp}@example.com`;
  jar.clear();
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
    body: JSON.stringify({ token: inviteToken, name: 'Dra Dashboard', password }),
  });
  if (accept.status !== 200) failed = true;
  const dentistToken = dataOf(accept).accessToken as string;
  const dentistMembershipId =
    (dataOf(accept).membership as { id: string } | undefined)?.id ??
    (accept.body?.data as { membership?: { id: string } } | undefined)?.membership?.id;

  jar.clear();
  // Essencial = 1 profissional; smoke precisa de owner + dentista → sobe para Clínica.
  await tenantDb.runInTenantContext(smokeCtx, (tx) =>
    tx.subscription.update({
      where: { tenantId },
      data: { planId: PLAN_IDS.CLINICA },
    }),
  );
  const dentistProf = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ membershipId: dentistMembershipId, croNumber: '88881', croState: 'GO' }),
  });
  if (dentistProf.status !== 201) failed = true;
  const dentistProfessionalId = dataOf(dentistProf).id as string;

  if (res01 && unitId && patientId) {
    await tenantDb.runInTenantContext(smokeCtx, (tx) =>
      tx.productionEntry.create({
        data: {
          id: randomUUID(),
          tenantId,
          unitId,
          professionalId: dentistProfessionalId,
          patientId,
          procedureId: res01.id,
          amountCents: 3_300n,
          executedAt: new Date(),
        },
      }),
    );
  }

  const dentistDash = await request(`/api/v1/reports/dashboard?date=${today}`, {
    headers: authHeaders(dentistToken, tenantId),
  });
  console.log(
    'dentist-dashboard',
    dentistDash.status,
    dataOf(dentistDash).receivableTodayCents,
    dataOf(dentistDash).productionMonthCents,
  );
  if (dentistDash.status !== 200) failed = true;
  if ((dataOf(dentistDash).receivableTodayCents as number) !== 0) failed = true;
  if ((dataOf(dentistDash).productionMonthCents as number) !== 3_300) failed = true;

  const dentistRevenue = await request(
    `/api/v1/reports/revenue?from=${today}&to=${today}&groupBy=day`,
    { headers: authHeaders(dentistToken, tenantId) },
  );
  console.log('dentist-revenue', dentistRevenue.status);
  if (dentistRevenue.status !== 403) failed = true;

  const dentistNoShows = await request(
    `/api/v1/reports/no-shows?from=${today}&to=${today}`,
    { headers: authHeaders(dentistToken, tenantId) },
  );
  console.log('dentist-no-shows', dentistNoShows.status);
  if (dentistNoShows.status !== 403) failed = true;

  const dentistOtherProc = await request(
    `/api/v1/reports/procedures?from=${today}&to=${today}&professionalId=${ownerProfessionalId}`,
    { headers: authHeaders(dentistToken, tenantId) },
  );
  console.log('dentist-other-proc', dentistOtherProc.status);
  if (dentistOtherProc.status !== 403) failed = true;

  const dentistOwnProc = await request(
    `/api/v1/reports/procedures?from=${today}&to=${today}`,
    { headers: authHeaders(dentistToken, tenantId) },
  );
  const dentistProcItems =
    (dataOf(dentistOwnProc).items as Array<{ totalCents: number }>) ?? [];
  console.log('dentist-own-proc', dentistOwnProc.status, dentistProcItems);
  if (dentistOwnProc.status !== 200) failed = true;
  if (!dentistProcItems.some((row) => row.totalCents === 3_300)) failed = true;
  if (dentistProcItems.some((row) => row.totalCents === 12_500)) failed = true;

  await closeReportCache();
  await prisma.$disconnect();
  server.close();
  if (failed) {
    console.error('FAIL: reporting dashboard smoke');
    process.exit(1);
  }
  console.log('OK: reporting dashboard smoke');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
