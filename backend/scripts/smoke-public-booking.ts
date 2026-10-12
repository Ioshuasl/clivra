import { once } from 'node:events';
import type { Server } from 'node:http';
import { getPrismaClient, getTenantPrisma } from '../src/shared/database/tenant_prisma.js';

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  process.env.NODE_ENV = 'test';
}

type Json = { status: number; body: Record<string, unknown> | null };

function spYmd(offsetDays: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const d = Number(parts.find((p) => p.type === 'day')?.value);
  const dt = new Date(Date.UTC(y, m - 1, (d ?? 1) + offsetDays));
  return dt.toISOString().slice(0, 10);
}

function isWeekdayYmd(ymd: string): boolean {
  const [year, month, day] = ymd.split('-').map(Number);
  const dow = new Date(Date.UTC(year, (month ?? 1) - 1, day)).getUTCDay();
  return dow >= 1 && dow <= 5;
}

/** Próximo dia útil (seg–sex) a partir de minOffsetDays — expediente onboarding é só Mon–Fri. */
function spYmdWeekday(minOffsetDays: number): string {
  for (let offset = minOffsetDays; offset < minOffsetDays + 14; offset++) {
    const ymd = spYmd(offset);
    if (isWeekdayYmd(ymd)) return ymd;
  }
  return spYmd(minOffsetDays);
}

function nextWeekdayAfter(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number);
  for (let add = 1; add <= 14; add++) {
    const next = new Date(Date.UTC(year, (month ?? 1) - 1, (day ?? 1) + add))
      .toISOString()
      .slice(0, 10);
    if (isWeekdayYmd(next)) return next;
  }
  return ymd;
}

async function main() {
  const { createApp } = await import('../src/app.js');
  const app = createApp();
  const server = app.listen(0) as Server;
  await once(server, 'listening');
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('no port');
  const origin = `http://127.0.0.1:${addr.port}`;
  const stamp = Date.now();
  let failed = false;

  const jar = new Map<string, string>();

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

  function errorCode(json: Json): string {
    return String((json.body?.error as { code?: string } | undefined)?.code ?? '');
  }

  function authHeaders(token: string, tenantId: string, extra?: HeadersInit): HeadersInit {
    return {
      authorization: `Bearer ${token}`,
      'x-tenant-id': tenantId,
      ...(extra as Record<string, string> | undefined),
    };
  }

  const signup = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `s3-pub-${stamp}@example.com`,
      password: 'SenhaForte!99',
      clinicName: 'Clinica Publica',
      ownerName: 'Owner Publico',
    }),
  });
  console.log('signup', signup.status);
  if (signup.status !== 201) failed = true;

  const accessToken = dataOf(signup).accessToken as string;
  const tenant = dataOf(signup).tenant as { id: string; slug: string };
  const membership = dataOf(signup).membership as { id: string };
  const tenantId = tenant.id;
  const slug = tenant.slug;

  const professional = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: { ...authHeaders(accessToken, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ membershipId: membership.id, croNumber: '11111', croState: 'GO' }),
  });
  console.log('professional', professional.status);
  if (professional.status !== 201) failed = true;
  const professionalId = dataOf(professional).id as string;

  const missing = await request('/api/v1/public/clinics/slug-inexistente-zzzz');
  console.log('clinic_404', missing.status, errorCode(missing));
  if (missing.status !== 404 || errorCode(missing) !== 'NOT_FOUND') failed = true;

  const clinic = await request(`/api/v1/public/clinics/${slug}`);
  console.log('public_clinic', clinic.status, (dataOf(clinic).procedures as unknown[])?.length);
  if (clinic.status !== 200) failed = true;
  const procedures = (dataOf(clinic).procedures ?? []) as Array<{ id: string; name: string }>;
  const professionals = (dataOf(clinic).professionals ?? []) as Array<{ id: string; name: string }>;
  if (procedures.length < 1 || !professionals.some((p) => p.id === professionalId)) failed = true;
  const procedureId = procedures[0]?.id;
  if (!procedureId) failed = true;

  const allProcedures = await request('/api/v1/procedures', {
    headers: authHeaders(accessToken, tenantId),
  });
  const procList = Array.isArray(allProcedures.body?.data)
    ? (allProcedures.body?.data as Array<{ id: string; code?: string }>)
    : [];
  const privateProcedure = procList.find((p) => p.id !== procedureId);

  const day = spYmdWeekday(2);
  const avail = await request(
    `/api/v1/public/clinics/${slug}/availability?procedureId=${procedureId}&professionalId=${professionalId}&from=${day}&to=${day}`,
  );
  console.log('availability', avail.status, (dataOf(avail).days as unknown[])?.length);
  if (avail.status !== 200) failed = true;
  const days = (dataOf(avail).days ?? []) as Array<{
    slots: Array<{ startsAt: string; available: boolean }>;
  }>;
  const slot = days[0]?.slots.find((s) => s.available);
  if (!slot) {
    console.error('FAIL: sem slot público disponível em', day);
    failed = true;
  }

  const noConsent = await request(`/api/v1/public/clinics/${slug}/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      procedureId,
      professionalId,
      startsAt: slot?.startsAt,
      name: 'Joao Paciente',
      phone: '62999990001',
      email: `joao-${stamp}@example.com`,
      consentDataProcessing: false,
      consentTerms: true,
    }),
  });
  console.log('no_consent', noConsent.status, errorCode(noConsent));
  if (noConsent.status !== 422 && noConsent.status !== 400) failed = true;

  if (privateProcedure?.id && slot) {
    const notPublic = await request(`/api/v1/public/clinics/${slug}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        procedureId: privateProcedure.id,
        professionalId,
        startsAt: slot.startsAt,
        name: 'Joao Paciente',
        phone: '62999990001',
        email: `joao2-${stamp}@example.com`,
        consentDataProcessing: true,
        consentTerms: true,
      }),
    });
    console.log('not_public_proc', notPublic.status, errorCode(notPublic));
    if (notPublic.status !== 422) failed = true;
  }

  const tooSoon = await request(`/api/v1/public/clinics/${slug}/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      procedureId,
      professionalId,
      startsAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      name: 'Joao Paciente',
      phone: '62999990001',
      email: `joao3-${stamp}@example.com`,
      consentDataProcessing: true,
      consentTerms: true,
    }),
  });
  console.log('lead_time', tooSoon.status, errorCode(tooSoon));
  if (tooSoon.status !== 422) failed = true;

  async function bookAndVerify(phone: string, email: string) {
    const created = await request(`/api/v1/public/clinics/${slug}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        procedureId,
        professionalId,
        startsAt: slot?.startsAt,
        name: 'Joao Paciente',
        phone,
        email,
        consentDataProcessing: true,
        consentTerms: true,
      }),
    });
    return created;
  }

  const firstBook = await bookAndVerify('62999990010', `otp-${stamp}@example.com`);
  console.log('booking', firstBook.status, dataOf(firstBook).otpSentVia);
  if (firstBook.status !== 201) failed = true;
  const bookingId = dataOf(firstBook).bookingId as string;
  const debugOtp = dataOf(firstBook).debugOtp as string;

  const wrong1 = await request(`/api/v1/public/clinics/${slug}/bookings/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ bookingId, code: '000000' }),
  });
  const wrong2 = await request(`/api/v1/public/clinics/${slug}/bookings/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ bookingId, code: '000001' }),
  });
  const wrong3 = await request(`/api/v1/public/clinics/${slug}/bookings/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ bookingId, code: '000002' }),
  });
  console.log('otp_fail', wrong1.status, wrong2.status, wrong3.status);
  if (wrong1.status !== 422 || wrong3.status !== 409) failed = true;

  const secondBook = await bookAndVerify('62999990011', `ok-${stamp}@example.com`);
  console.log('booking2', secondBook.status);
  const bookingId2 = dataOf(secondBook).bookingId as string;
  const otp2 = dataOf(secondBook).debugOtp as string;
  const verifyOk = await request(`/api/v1/public/clinics/${slug}/bookings/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ bookingId: bookingId2, code: otp2 }),
  });
  console.log('verify_ok', verifyOk.status, (dataOf(verifyOk).appointment as { origin?: string })?.origin);
  if (verifyOk.status !== 200) failed = true;
  const appointment = dataOf(verifyOk).appointment as {
    id: string;
    origin: string;
    status: string;
  };
  const patient = dataOf(verifyOk).patient as { origin?: string; needsDataReview?: boolean };
  if (appointment?.origin !== 'PUBLIC_BOOKING' || patient?.origin !== 'PUBLIC_BOOKING') failed = true;
  if (appointment?.status !== 'REQUESTED') failed = true;

  const confirmRequested = await request(
    `/api/v1/public/appointments/${dataOf(verifyOk).confirmationToken as string}/confirm`,
  );
  console.log('confirm_requested', confirmRequested.status, errorCode(confirmRequested));
  if (confirmRequested.status !== 409) failed = true;

  const db = getTenantPrisma();
  await db.runInTenantContext(
    { tenantId, userId: membership.id, requestId: `smoke-${stamp}` },
    async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          bookingSettings: {
            minLeadMinutes: 120,
            maxLeadDays: 60,
            publicStatus: 'SCHEDULED',
            courtesyTransactionalMessages: 50,
          },
        },
      });
    },
  );

  const day3 = nextWeekdayAfter(day);
  const avail2 = await request(
    `/api/v1/public/clinics/${slug}/availability?procedureId=${procedureId}&professionalId=${professionalId}&from=${day3}&to=${day3}`,
  );
  const slot2 = (
    (dataOf(avail2).days ?? []) as Array<{ slots: Array<{ startsAt: string; available: boolean }> }>
  )[0]?.slots.find((s) => s.available);
  const scheduledBook = await request(`/api/v1/public/clinics/${slug}/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      procedureId,
      professionalId,
      startsAt: slot2?.startsAt ?? slot?.startsAt,
      name: 'Maria Paciente',
      phone: '62999990012',
      email: `maria-${stamp}@example.com`,
      consentDataProcessing: true,
      consentTerms: true,
    }),
  });
  const verifySched = await request(`/api/v1/public/clinics/${slug}/bookings/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      bookingId: dataOf(scheduledBook).bookingId,
      code: dataOf(scheduledBook).debugOtp,
    }),
  });
  console.log('verify_scheduled', verifySched.status, (dataOf(verifySched).appointment as { status?: string })?.status);
  if ((dataOf(verifySched).appointment as { status?: string })?.status !== 'SCHEDULED') failed = true;

  const confirmToken = dataOf(verifySched).confirmationToken as string;
  const confirm1 = await request(`/api/v1/public/appointments/${confirmToken}/confirm`);
  const confirm2 = await request(`/api/v1/public/appointments/${confirmToken}/confirm`);
  console.log('confirm', confirm1.status, (dataOf(confirm1) as { status?: string }).status, confirm2.status);
  if (confirm1.status !== 200 || (dataOf(confirm1) as { status?: string }).status !== 'CONFIRMED') {
    failed = true;
  }
  if (confirm2.status !== 200) failed = true;

  void debugOtp;
  server.close();
  await getPrismaClient().$disconnect();

  if (failed) process.exit(1);
  console.log('OK: public booking smoke passed');
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
