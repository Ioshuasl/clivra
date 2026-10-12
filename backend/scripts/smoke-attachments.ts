process.env.STORAGE_FAKE = '1';

import { createHash, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { getPrismaClient, getTenantPrisma } from '../src/shared/database/tenant_prisma.js';
import { getObjectStorage } from '../src/shared/storage/index.js';
import { generateAttachmentThumbnailJob } from '../src/modules/clinical_records/jobs/generate_attachment_thumbnail.job.js';
import { hashToken } from '../src/shared/helpers/token_hash.js';
import { addDays } from '../src/modules/identity/helpers/slug.helper.js';
import { Role } from '../src/modules/identity/enum/role/role.enum.js';
import { env } from '../src/shared/config/env.js';

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

  function errorCode(json: Json): string | undefined {
    const err = json.body?.error as { code?: string } | undefined;
    return err?.code;
  }

  function authHeaders(token: string, tenantId?: string): HeadersInit {
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    return headers;
  }

  const password = 'SenhaForte!99';
  const ownerEmail = `s4-attach-${stamp}@example.com`;
  const assistantEmail = `s4-attach-asb-${stamp}@example.com`;
  const receptionEmail = `s4-attach-rec-${stamp}@example.com`;

  const signup = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: ownerEmail,
      password,
      clinicName: 'Clinica Anexos',
      ownerName: 'Owner Anexos',
    }),
  });
  console.log('signup', signup.status);
  if (signup.status !== 201) failed = true;
  const token = dataOf(signup).accessToken as string;
  const tenantId = (dataOf(signup).tenant as { id: string }).id;
  const ownerUserId = (dataOf(signup).user as { id: string }).id;

  const createPatient = await request('/api/v1/patients', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Paciente Anexo', phonePrimary: '62999993333' }),
  });
  console.log('patient-create', createPatient.status);
  if (createPatient.status !== 201) failed = true;
  const patientId = (dataOf(createPatient).patient as { id: string }).id;

  const badMime = await request(`/api/v1/patients/${patientId}/attachments/presign`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: 'virus.exe',
      mimeType: 'application/x-msdownload',
      sizeBytes: 100,
      category: 'OTHER',
    }),
  });
  console.log('presign-bad-mime', badMime.status, errorCode(badMime));
  if (badMime.status !== 415 || errorCode(badMime) !== 'UNSUPPORTED_MEDIA_TYPE') failed = true;

  const tooBig = await request(`/api/v1/patients/${patientId}/attachments/presign`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: 'huge.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 21 * 1024 * 1024,
      category: 'XRAY',
    }),
  });
  console.log('presign-too-big', tooBig.status, errorCode(tooBig));
  if (tooBig.status !== 422 || errorCode(tooBig) !== 'BUSINESS_RULE_VIOLATION') failed = true;

  const prisma = getPrismaClient();
  const tenantDb = getTenantPrisma();
  const smokeCtx = { tenantId, userId: ownerUserId, requestId: 'smoke' };

  const record = await tenantDb.runInTenantContext(smokeCtx, async (tx) =>
    tx.medicalRecord.findFirst({ where: { tenantId, patientId } }),
  );
  const quotaRowId = randomUUID();
  await tenantDb.runInTenantContext(smokeCtx, async (tx) => {
    await tx.attachment.create({
      data: {
        id: quotaRowId,
        tenantId,
        medicalRecordId: record?.id,
        patientId,
        category: 'OTHER',
        fileName: 'quota.bin',
        storageKey: `tenants/${tenantId}/patients/${patientId}/quota.bin`,
        mimeType: 'application/pdf',
        sizeBytes: BigInt(env.ATTACHMENT_QUOTA_BYTES),
        checksumSha256: 'a'.repeat(64),
        uploadedBy: ownerUserId,
      },
    });
  });

  const overQuota = await request(`/api/v1/patients/${patientId}/attachments/presign`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: 'rx.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 100,
      category: 'XRAY',
    }),
  });
  console.log('presign-quota', overQuota.status, errorCode(overQuota));
  if (overQuota.status !== 402 || errorCode(overQuota) !== 'PLAN_LIMIT_EXCEEDED') failed = true;

  await tenantDb.runInTenantContext(smokeCtx, async (tx) => {
    await tx.attachment.delete({ where: { id: quotaRowId } });
  });

  const fileBytes = Buffer.from('fake-jpeg-bytes-for-smoke-test');
  const checksum = createHash('sha256').update(fileBytes).digest('hex');

  const presign = await request(`/api/v1/patients/${patientId}/attachments/presign`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: 'rx-panoramica.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: fileBytes.length,
      category: 'XRAY',
    }),
  });
  console.log('presign-ok', presign.status, dataOf(presign).method);
  if (presign.status !== 200 || dataOf(presign).method !== 'PUT') failed = true;
  const storageKey = dataOf(presign).storageKey as string;
  if (!storageKey?.includes(patientId)) failed = true;

  await getObjectStorage().putObject(storageKey, fileBytes, 'image/jpeg');

  const confirm = await request(`/api/v1/patients/${patientId}/attachments`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      storageKey,
      checksumSha256: checksum,
      fileName: 'rx-panoramica.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: fileBytes.length,
      category: 'XRAY',
    }),
  });
  console.log('confirm', confirm.status, dataOf(confirm).category);
  if (confirm.status !== 201 || dataOf(confirm).category !== 'XRAY') failed = true;
  const attachmentId = dataOf(confirm).id as string;

  const confirmAgain = await request(`/api/v1/patients/${patientId}/attachments`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      storageKey,
      checksumSha256: checksum,
      fileName: 'rx-panoramica.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: fileBytes.length,
      category: 'XRAY',
    }),
  });
  console.log('confirm-idempotent', confirmAgain.status, dataOf(confirmAgain).id);
  if (confirmAgain.status !== 201 && confirmAgain.status !== 200) failed = true;
  if (dataOf(confirmAgain).id !== attachmentId) failed = true;

  const list = await request(`/api/v1/patients/${patientId}/attachments`, {
    headers: authHeaders(token, tenantId),
  });
  const items = (dataOf(list).items as Array<Record<string, unknown>>) ?? [];
  console.log('list', list.status, items.length);
  if (list.status !== 200 || items.length !== 1) failed = true;

  const download = await request(`/api/v1/attachments/${attachmentId}/download`, {
    headers: authHeaders(token, tenantId),
  });
  console.log('download', download.status, Boolean(dataOf(download).downloadUrl));
  if (download.status !== 200 || !dataOf(download).downloadUrl) failed = true;
  if (dataOf(download).expiresIn !== 900) failed = true;

  const audit = await tenantDb.runInTenantContext(smokeCtx, async (tx) =>
    tx.auditLog.findFirst({
      where: { tenantId, action: 'READ', resourceType: 'attachment', patientId },
      orderBy: { createdAt: 'desc' },
    }),
  );
  console.log('audit-download', Boolean(audit?.patientId));
  if (!audit?.patientId) failed = true;

  await generateAttachmentThumbnailJob({
    tenantId,
    requestId: 'smoke-thumb',
    attachmentId,
  });
  const afterThumb = await tenantDb.runInTenantContext(smokeCtx, async (tx) =>
    tx.attachment.findFirst({ where: { id: attachmentId, tenantId } }),
  );
  console.log('thumbnail', Boolean(afterThumb?.thumbnailKey));
  if (!afterThumb?.thumbnailKey) failed = true;
  const originalStillThere = await getObjectStorage().getObject(storageKey);
  if (!originalStillThere || originalStillThere.length !== fileBytes.length) failed = true;

  const outbox = await tenantDb.runInTenantContext(smokeCtx, async (tx) =>
    tx.outboxEvent.findFirst({
      where: { tenantId, name: 'clinical_records.attachment_created' },
      orderBy: { occurredAt: 'desc' },
    }),
  );
  console.log('outbox-attachment', Boolean(outbox));
  if (!outbox) failed = true;

  const deleteShort = await request(`/api/v1/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ reason: 'curto' }),
  });
  console.log('delete-short', deleteShort.status, errorCode(deleteShort));
  if (deleteShort.status !== 422 || errorCode(deleteShort) !== 'BUSINESS_RULE_VIOLATION') {
    failed = true;
  }

  async function acceptInvite(email: string, role: string, name: string) {
    const invite = await request('/api/v1/users/invitations', {
      method: 'POST',
      headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    if (invite.status !== 201) failed = true;
    const inviteId = dataOf(invite).id as string;
    const inviteToken = `attach-${role.toLowerCase()}-${stamp}`;
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
      body: JSON.stringify({ token: inviteToken, name, password }),
    });
    if (accept.status !== 200) failed = true;
    return dataOf(accept).accessToken as string;
  }

  const asbAccess = await acceptInvite(assistantEmail, Role.ASSISTANT, 'Assistente');
  const asbList = await request(`/api/v1/patients/${patientId}/attachments`, {
    headers: authHeaders(asbAccess, tenantId),
  });
  console.log('asb-list', asbList.status);
  if (asbList.status !== 200) failed = true;

  const asbFile = Buffer.from('asb-photo');
  const asbChecksum = createHash('sha256').update(asbFile).digest('hex');
  const asbPresign = await request(`/api/v1/patients/${patientId}/attachments/presign`, {
    method: 'POST',
    headers: { ...authHeaders(asbAccess, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: 'intra.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: asbFile.length,
      category: 'PHOTO_INTRAORAL',
    }),
  });
  console.log('asb-presign', asbPresign.status);
  if (asbPresign.status !== 200) failed = true;
  const asbKey = dataOf(asbPresign).storageKey as string;
  await getObjectStorage().putObject(asbKey, asbFile, 'image/jpeg');
  const asbConfirm = await request(`/api/v1/patients/${patientId}/attachments`, {
    method: 'POST',
    headers: { ...authHeaders(asbAccess, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      storageKey: asbKey,
      checksumSha256: asbChecksum,
      fileName: 'intra.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: asbFile.length,
      category: 'PHOTO_INTRAORAL',
    }),
  });
  console.log('asb-confirm', asbConfirm.status);
  if (asbConfirm.status !== 201) failed = true;
  const asbAttachmentId = dataOf(asbConfirm).id as string;
  const asbDelete = await request(`/api/v1/attachments/${asbAttachmentId}`, {
    method: 'DELETE',
    headers: { ...authHeaders(asbAccess, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ reason: 'tentativa de exclusao pelo asb' }),
  });
  console.log('asb-delete', asbDelete.status, errorCode(asbDelete));
  if (asbDelete.status !== 403 || errorCode(asbDelete) !== 'FORBIDDEN') failed = true;

  const recAccess = await acceptInvite(receptionEmail, Role.RECEPTION, 'Recepcionista');
  const recList = await request(`/api/v1/patients/${patientId}/attachments`, {
    headers: authHeaders(recAccess, tenantId),
  });
  console.log('reception-list', recList.status, errorCode(recList));
  if (recList.status !== 403 || errorCode(recList) !== 'FORBIDDEN') failed = true;

  const signupB = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `s4-attach-b-${stamp}@example.com`,
      password,
      clinicName: 'Clinica B Anexos',
      ownerName: 'Owner B',
    }),
  });
  const tokenB = dataOf(signupB).accessToken as string;
  const tenantB = (dataOf(signupB).tenant as { id: string }).id;
  const cross = await request(`/api/v1/attachments/${attachmentId}/download`, {
    headers: authHeaders(tokenB, tenantB),
  });
  console.log('cross-tenant-download', cross.status, errorCode(cross));
  if (cross.status !== 404 || errorCode(cross) !== 'NOT_FOUND') failed = true;

  jar.clear();
  const del = await request(`/api/v1/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ reason: 'arquivo enviado por engano' }),
  });
  console.log('delete', del.status, Boolean(dataOf(del).deletedAt));
  if (del.status !== 200 || !dataOf(del).deletedAt) failed = true;

  const listAfter = await request(`/api/v1/patients/${patientId}/attachments`, {
    headers: authHeaders(token, tenantId),
  });
  const afterItems = (dataOf(listAfter).items as unknown[]) ?? [];
  console.log('list-after-delete', listAfter.status, afterItems.length);
  if (listAfter.status !== 200 || afterItems.length < 1) failed = true;

  const downloadDeleted = await request(`/api/v1/attachments/${attachmentId}/download`, {
    headers: authHeaders(token, tenantId),
  });
  console.log('download-deleted', downloadDeleted.status, errorCode(downloadDeleted));
  if (downloadDeleted.status !== 404) failed = true;

  server.close();
  await prisma.$disconnect();

  if (failed) {
    console.error('FAIL: attachments smoke');
    process.exit(1);
  }
  console.log('OK: attachments smoke passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
