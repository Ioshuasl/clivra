import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { getPrismaClient, getTenantPrisma } from '../src/shared/database/tenant_prisma.js';
import { Role } from '../src/modules/identity/enum/role/role.enum.js';
import { hashToken } from '../src/shared/helpers/token_hash.js';
import { addDays } from '../src/modules/identity/helpers/slug.helper.js';
import { generateExportJob } from '../src/modules/reporting/jobs/report_export.job.js';
import { AuditAction } from '../src/shared/database/write_audit.js';
import { resetObjectStorageForTests } from '../src/shared/storage/index.js';
import { PLAN_IDS } from '../src/modules/subscription/enum/plan/plan_code.enum.js';

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
      email: `s7-rep-exp-${stamp}@example.com`,
      password,
      clinicName: 'Clinica Export S7',
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
  if (!unitId) failed = true;

  const professional = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ membershipId, croNumber: '77772', croState: 'GO' }),
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
      name: 'Paciente Export',
      phonePrimary: '62977773002',
      birthDate: '1992-03-11',
    }),
  });
  if (patient.status !== 201) failed = true;
  const patientId = (dataOf(patient).patient as { id: string }).id;

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
          amountCents: 15_000n,
          executedAt: new Date(),
        },
      }),
    );
  }

  const exportPost = await request('/api/v1/reports/procedures/export', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ format: 'CSV', from: today, to: today }),
  });
  console.log('export-post', exportPost.status, dataOf(exportPost));
  if (exportPost.status !== 202) failed = true;
  const exportId = dataOf(exportPost).exportId as string;
  if (!exportId) failed = true;
  if (dataOf(exportPost).status !== 'PENDING') failed = true;

  const audit = await tenantDb.runInTenantContext(smokeCtx, (tx) =>
    tx.auditLog.findFirst({
      where: {
        action: AuditAction.REPORT_EXPORTED,
        resourceType: 'report_export',
        resourceId: exportId,
      },
    }),
  );
  console.log('audit-report-exported', Boolean(audit));
  if (!audit) failed = true;

  await generateExportJob({
    tenantId,
    requestId: 'smoke-reporting-export-job',
    exportId,
  });

  const exportGet = await request(`/api/v1/exports/${exportId}`, {
    headers: authHeaders(token, tenantId),
  });
  const exportData = dataOf(exportGet);
  console.log('export-get', exportGet.status, exportData.status, Boolean(exportData.downloadUrl));
  if (exportGet.status !== 200) failed = true;
  if (exportData.status !== 'READY') failed = true;
  if (typeof exportData.downloadUrl !== 'string' || !exportData.downloadUrl) failed = true;
  if (exportData.downloadExpiresInSeconds !== 900) failed = true;

  const row = await tenantDb.runInTenantContext(smokeCtx, (tx) =>
    tx.reportExport.findFirst({ where: { id: exportId } }),
  );
  console.log('storage-key', Boolean(row?.storageKey));
  if (!row?.storageKey) failed = true;

  // Dentista: só próprio escopo
  const dentistEmail = `s7-rep-exp-den-${stamp}@example.com`;
  jar.clear();
  const invite = await request('/api/v1/users/invitations', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ email: dentistEmail, role: Role.DENTIST }),
  });
  if (invite.status !== 201) failed = true;
  const inviteId = dataOf(invite).id as string;
  const inviteToken = `rep-exp-den-${stamp}`;
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
    body: JSON.stringify({ membershipId: dentistMembershipId, croNumber: '88882', croState: 'GO' }),
  });
  console.log('dentist-professional', dentistProf.status, dentistMembershipId);
  if (dentistProf.status !== 201) failed = true;
  const dentistProfessionalId = dataOf(dentistProf).id as string;
  if (!dentistProfessionalId) failed = true;

  if (res01 && unitId && patientId && dentistProfessionalId) {
    await tenantDb.runInTenantContext(smokeCtx, (tx) =>
      tx.productionEntry.create({
        data: {
          id: randomUUID(),
          tenantId,
          unitId,
          professionalId: dentistProfessionalId,
          patientId,
          procedureId: res01.id,
          amountCents: 4_400n,
          executedAt: new Date(),
        },
      }),
    );
  }

  jar.clear();
  const dentistExport = await request('/api/v1/reports/procedures/export', {
    method: 'POST',
    headers: { ...authHeaders(dentistToken, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ format: 'CSV', from: today, to: today }),
  });
  console.log('dentist-export-post', dentistExport.status);
  if (dentistExport.status !== 202) failed = true;
  const dentistExportId = dataOf(dentistExport).exportId as string;

  await generateExportJob({
    tenantId,
    requestId: 'smoke-reporting-export-dentist',
    exportId: dentistExportId,
  });

  const dentistExportRow = await tenantDb.runInTenantContext(smokeCtx, (tx) =>
    tx.reportExport.findFirst({ where: { id: dentistExportId } }),
  );
  const dentistFilters = (dentistExportRow?.filters ?? {}) as { professionalId?: string };
  console.log('dentist-scoped', dentistFilters.professionalId === dentistProfessionalId);
  if (dentistFilters.professionalId !== dentistProfessionalId) failed = true;

  const dentistFinancialExport = await request('/api/v1/reports/revenue/export', {
    method: 'POST',
    headers: { ...authHeaders(dentistToken, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ format: 'CSV', from: today, to: today }),
  });
  console.log('dentist-revenue-export', dentistFinancialExport.status, errorCode(dentistFinancialExport));
  if (dentistFinancialExport.status !== 403) failed = true;

  // Cross-tenant → 404
  jar.clear();
  const signupB = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `s7-rep-exp-b-${stamp}@example.com`,
      password,
      clinicName: 'Clinica Export B',
      ownerName: 'Owner B',
    }),
  });
  if (signupB.status !== 201) failed = true;
  const tokenB = dataOf(signupB).accessToken as string;
  const tenantB = (dataOf(signupB).tenant as { id: string }).id;

  jar.clear();
  const cross = await request(`/api/v1/exports/${exportId}`, {
    headers: authHeaders(tokenB, tenantB),
  });
  console.log('cross-tenant', cross.status, errorCode(cross));
  if (cross.status !== 404) failed = true;

  const unknownReport = await request('/api/v1/reports/cash-flow/export', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ format: 'CSV', from: today, to: today }),
  });
  console.log('unknown-report', unknownReport.status);
  if (unknownReport.status !== 404) failed = true;

  server.close();
  await prisma.$disconnect();
  if (failed) {
    console.error('SMOKE reporting-export FAILED');
    process.exit(1);
  }
  console.log('SMOKE reporting-export OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
