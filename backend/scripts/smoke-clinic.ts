import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { getWorkingWindows } from '../src/modules/clinic/clinic_public.js';

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

  function authHeaders(token: string, tenantId?: string): HeadersInit {
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    return headers;
  }

  const password = 'SenhaForte!99';
  const ownerEmail = `s3-owner-${stamp}@example.com`;

  const signup = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: ownerEmail,
      password,
      clinicName: 'Clinica Bloco3',
      ownerName: 'Owner S3',
    }),
  });
  console.log('signup', signup.status);
  if (signup.status !== 201) failed = true;

  const token = dataOf(signup).accessToken as string;
  const tenantId = (dataOf(signup).tenant as { id: string }).id;
  const membershipId = (dataOf(signup).membership as { id: string }).id;

  const clinicGet = await request('/api/v1/clinic', {
    headers: authHeaders(token, tenantId),
  });
  console.log('clinic-get', clinicGet.status, (dataOf(clinicGet).slug as string) ?? '');
  if (clinicGet.status !== 200) failed = true;

  const clinicPatch = await request('/api/v1/clinic', {
    method: 'PATCH',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      legalName: 'Clinica Bloco3 LTDA',
      taxId: '12345678000199',
      responsibleCro: '12345',
      phone: '62999990000',
      acceptedPaymentMethods: ['CASH', 'PIX', 'CREDIT_CARD'],
    }),
  });
  console.log('clinic-patch', clinicPatch.status);
  if (clinicPatch.status !== 200) failed = true;

  const units = await request('/api/v1/clinic/units', {
    headers: authHeaders(token, tenantId),
  });
  console.log('units-list', units.status, (dataOf(units) as unknown[]).length ?? 0);
  if (units.status !== 200) failed = true;
  const defaultUnitId = ((dataOf(units) as Array<{ id: string; isDefault: boolean }>)[0] ?? {})
    .id;

  // Agenda por cadeira vem desligada por padrão: liga antes de cadastrar cadeiras.
  const enableChairs = await request('/api/v1/clinic', {
    method: 'PATCH',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ chairsEnabled: true }),
  });
  console.log('chairs-enable', enableChairs.status);
  if (enableChairs.status !== 200) failed = true;

  const chair = await request(`/api/v1/clinic/units/${defaultUnitId}/chairs`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Sala 1', color: '#3366FF' }),
  });
  console.log('chair-create', chair.status);
  if (chair.status !== 201) failed = true;
  const chairId = dataOf(chair).id as string;

  const chairPatch = await request(`/api/v1/clinic/units/${defaultUnitId}/chairs/${chairId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ active: false, name: 'Sala 1A' }),
  });
  console.log('chair-patch', chairPatch.status, dataOf(chairPatch).active);
  if (chairPatch.status !== 200 || dataOf(chairPatch).active !== false) failed = true;

  const hoursPut = await request('/api/v1/clinic/business-hours', {
    method: 'PUT',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      unitId: defaultUnitId,
      slots: [
        { weekday: 1, startsAt: '08:00', endsAt: '12:00' },
        { weekday: 1, startsAt: '13:00', endsAt: '18:00' },
      ],
    }),
  });
  console.log('hours-put', hoursPut.status);
  if (hoursPut.status !== 200) failed = true;

  const exception = await request('/api/v1/clinic/business-hours/exceptions', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      unitId: defaultUnitId,
      date: '2026-12-25',
      closed: true,
      reason: 'Natal',
    }),
  });
  console.log('hours-exception', exception.status);
  if (exception.status !== 201) failed = true;
  const exceptionConflicts = dataOf(exception).conflicts;
  if (!Array.isArray(exceptionConflicts)) failed = true;

  const sundayHours = await request('/api/v1/clinic/business-hours', {
    method: 'PUT',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      unitId: defaultUnitId,
      slots: [
        { weekday: 1, startsAt: '08:00', endsAt: '12:00' },
        { weekday: 1, startsAt: '13:00', endsAt: '18:00' },
        { weekday: 7, startsAt: '09:00', endsAt: '12:00' },
      ],
    }),
  });
  console.log('hours-put-sunday', sundayHours.status, (dataOf(sundayHours) as unknown[]).length);
  if (sundayHours.status !== 200) failed = true;
  if (!((dataOf(sundayHours) as Array<{ weekday: number }>).some((s) => s.weekday === 7))) {
    failed = true;
  }

  const mondayWindows = await getWorkingWindows({
    tenantId,
    unitId: defaultUnitId,
    date: '2026-08-17',
  });
  console.log('working-windows-monday', mondayWindows.length);
  if (mondayWindows.length !== 2) failed = true;

  const christmasWindows = await getWorkingWindows({
    tenantId,
    unitId: defaultUnitId,
    date: '2026-12-25',
  });
  console.log('working-windows-christmas', christmasWindows.length);
  if (christmasWindows.length !== 0) failed = true;

  const professional = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      membershipId,
      croNumber: '12345',
      croState: 'GO',
      specialties: ['Clínica geral'],
      color: '#FF6633',
    }),
  });
  console.log('professional-create', professional.status);
  if (professional.status !== 201) failed = true;
  const professionalId = dataOf(professional).id as string;

  const proHours = await request('/api/v1/clinic/business-hours', {
    method: 'PUT',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      unitId: defaultUnitId,
      professionalId,
      slots: [{ weekday: 1, startsAt: '09:00', endsAt: '11:00' }],
    }),
  });
  console.log('pro-hours-put', proHours.status);
  if (proHours.status !== 200) failed = true;

  const intersected = await getWorkingWindows({
    tenantId,
    unitId: defaultUnitId,
    professionalId,
    date: '2026-08-17',
  });
  console.log('working-windows-intersect', intersected.length);
  if (intersected.length !== 1) failed = true;
  if (intersected[0]) {
    const startHour = intersected[0].startsAt.getUTCHours();
    const endHour = intersected[0].endsAt.getUTCHours();
    // America/Sao_Paulo is UTC-3 (no DST in 2026): 09:00 local = 12:00 UTC
    if (startHour !== 12 || endHour !== 14) failed = true;
  }

  const procedures = await request('/api/v1/procedures', {
    headers: authHeaders(token, tenantId),
  });
  console.log('procedures-list', procedures.status, (dataOf(procedures) as unknown[]).length ?? 0);
  if (procedures.status !== 200) failed = true;

  const firstProcedure = (dataOf(procedures) as Array<{ id: string; code: string }>)[0];
  const procPatch = await request(`/api/v1/procedures/${firstProcedure?.id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ priceCents: 15000 }),
  });
  console.log('procedure-patch', procPatch.status);
  if (procPatch.status !== 200) failed = true;

  const importCatalog = await request('/api/v1/procedures/import-catalog', {
    method: 'POST',
    headers: authHeaders(token, tenantId),
  });
  console.log('import-catalog', importCatalog.status, dataOf(importCatalog));
  if (importCatalog.status !== 200) failed = true;
  const skipped = (dataOf(importCatalog).skipped as number) ?? 0;
  if (skipped < 1) failed = true;

  const onboarding = await request('/api/v1/clinic/onboarding', {
    headers: authHeaders(token, tenantId),
  });
  console.log('onboarding-get', onboarding.status, dataOf(onboarding).completed);
  if (onboarding.status !== 200) failed = true;

  const onboardingSkip = await request('/api/v1/clinic/onboarding', {
    method: 'PATCH',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ skipStep: 'whatsapp' }),
  });
  console.log('onboarding-skip', onboardingSkip.status);
  if (onboardingSkip.status !== 200) failed = true;

  const duplicateChair = await request(`/api/v1/clinic/units/${defaultUnitId}/chairs`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Sala 1A' }),
  });
  console.log('chair-duplicate', duplicateChair.status);
  if (duplicateChair.status !== 409) failed = true;

  server.close();
  if (failed) {
    console.error('smoke-clinic FAILED');
    process.exit(1);
  }
  console.log('smoke-clinic OK');
}

void main();
