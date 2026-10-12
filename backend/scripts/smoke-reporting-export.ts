process.env.STORAGE_FAKE = '1';

import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { InMemoryJobQueue } from '../src/shared/queue/in_memory_job_queue.js';
import { setJobQueue } from '../src/shared/queue/job_queue_singleton.js';
import { JOB, QUEUE } from '../src/shared/queue/queue_names.js';
import { getObjectStorage, resetObjectStorageForTests } from '../src/shared/storage/index.js';
import { Role } from '../src/modules/identity/enum/role/role.enum.js';
import { hashToken } from '../src/shared/helpers/token_hash.js';
import { addDays } from '../src/modules/identity/helpers/slug.helper.js';
import { getPrismaClient, getTenantPrisma } from '../src/shared/database/tenant_prisma.js';

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  process.env.NODE_ENV = 'test';
}

type Json = { status: number; body: Record<string, unknown> | null };

async function main() {
  resetObjectStorageForTests();
  const queue = new InMemoryJobQueue();
  setJobQueue(queue);
  const { reportExportJob } = await import('../src/modules/reporting/jobs/report_export.job.js');
  queue.register(QUEUE.reporting, JOB.generateExport, reportExportJob);

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

  function authHeaders(token: string, tenantId?: string): HeadersInit {
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
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
      email: `s7-export-${stamp}@example.com`,
      password,
      clinicName: 'Clinica Export',
      ownerName: 'Owner Export',
    }),
  });
  console.log('signup', signup.status);
  if (signup.status !== 201) failed = true;
  const token = dataOf(signup).accessToken as string;
  const tenantId = (dataOf(signup).tenant as { id: string }).id;
  const ownerUserId = (dataOf(signup).user as { id: string }).id;
  const membershipId = (dataOf(signup).membership as { id: string }).id;
  const smokeCtx = { tenantId, userId: ownerUserId, requestId: 'smoke-reporting-export' };

  const units = await request('/api/v1/clinic/units', { headers: authHeaders(token, tenantId) });
  const unitId = ((units.body?.data as Array<{ id: string }>) ?? [])[0]?.id;
  const professional = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ membershipId, croNumber: '44444', croState: 'GO' }),
  });
  const ownerProfessionalId = dataOf(professional).id as string;

  const patient = await request('/api/v1/patients', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Maria Export', phonePrimary: '62977774001' }),
  });
  const patientId = (dataOf(patient).patient as { id: string }).id;
  const procedures = await request('/api/v1/procedures', { headers: authHeaders(token, tenantId) });
  const res01 = ((procedures.body?.data as Array<{ id: string; code: string }>) ?? []).find(
    (row) => row.code === 'RES-01',
  );

  if (unitId && ownerProfessionalId && patientId && res01) {
    const confirmedAt = new Date(`${today}T10:00:00-03:00`);
    await tenantDb.runInTenantContext(smokeCtx, async (tx) => {
      await tx.productionEntry.create({
        data: {
          id: randomUUID(),
          tenantId,
          unitId,
          professionalId: ownerProfessionalId,
          patientId,
          procedureId: res01.id,
          amountCents: 12000n,
          executedAt: confirmedAt,
        },
      });
    });
  }

  const xlsx = await request('/api/v1/reports/procedures/export', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ format: 'XLSX', from: today, to: today }),
  });
  console.log('xlsx', xlsx.status, errorCode(xlsx));
  if (xlsx.status !== 501 || errorCode(xlsx) !== 'NOT_IMPLEMENTED') failed = true;

  const created = await request('/api/v1/reports/procedures/export', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ format: 'CSV', from: today, to: today }),
  });
  console.log('create', created.status, dataOf(created).exportId, dataOf(created).status);
  if (created.status !== 202 || dataOf(created).status !== 'PENDING' || !dataOf(created).exportId) {
    failed = true;
  }
  const exportId = dataOf(created).exportId as string;

  const pending = await request(`/api/v1/exports/${exportId}`, {
    headers: authHeaders(token, tenantId),
  });
  console.log('pending', pending.status, dataOf(pending).status, dataOf(pending).url);
  if (pending.status !== 200 || dataOf(pending).status !== 'PENDING' || dataOf(pending).url !== null) {
    failed = true;
  }

  await queue.drain();

  const ready = await request(`/api/v1/exports/${exportId}`, {
    headers: authHeaders(token, tenantId),
  });
  console.log('ready', ready.status, dataOf(ready).status, Boolean(dataOf(ready).url), dataOf(ready).expiresIn);
  if (ready.status !== 200 || dataOf(ready).status !== 'READY') failed = true;
  if (typeof dataOf(ready).url !== 'string' || dataOf(ready).expiresIn !== 900) failed = true;

  const storageKey = `tenants/${tenantId}/exports/${exportId}.csv`;
  const csvBuffer = await getObjectStorage().getObject(storageKey);
  const csvText = csvBuffer?.toString('utf8') ?? '';
  const hasBom = csvText.charCodeAt(0) === 0xfeff;
  const hasSemicolon = csvText.includes(';');
  console.log('csv', hasBom, hasSemicolon, csvText.includes('procedureName'));
  if (!hasBom || !hasSemicolon || !csvText.includes('12000')) failed = true;

  jar.clear();
  const other = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `s7-export-b-${stamp}@example.com`,
      password,
      clinicName: 'Clinica B Export',
      ownerName: 'Owner B',
    }),
  });
  const otherToken = dataOf(other).accessToken as string;
  const otherTenantId = (dataOf(other).tenant as { id: string }).id;
  const cross = await request(`/api/v1/exports/${exportId}`, {
    headers: authHeaders(otherToken, otherTenantId),
  });
  console.log('cross-tenant', cross.status);
  if (cross.status !== 404) failed = true;

  const dentistEmail = `s7-export-den-${stamp}@example.com`;
  const invite = await request('/api/v1/users/invitations', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ email: dentistEmail, role: Role.DENTIST }),
  });
  const inviteId = dataOf(invite).id as string;
  const inviteToken = `exp-den-${stamp}`;
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
    body: JSON.stringify({ token: inviteToken, name: 'Dra Export', password }),
  });
  const dentistToken = dataOf(accept).accessToken as string;
  const dentistRevenue = await request('/api/v1/reports/revenue/export', {
    method: 'POST',
    headers: { ...authHeaders(dentistToken, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ format: 'CSV', from: today, to: today }),
  });
  console.log('dentist-revenue-export', dentistRevenue.status);
  if (dentistRevenue.status !== 403) failed = true;

  await getPrismaClient().$disconnect();
  server.close();
  if (failed) {
    console.error('FAIL: reporting export smoke');
    process.exit(1);
  }
  console.log('OK: reporting export smoke');
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
