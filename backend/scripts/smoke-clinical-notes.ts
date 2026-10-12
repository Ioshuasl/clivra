import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { getPrismaClient, getTenantPrisma } from '../src/shared/database/tenant_prisma.js';
import { hashToken } from '../src/shared/helpers/token_hash.js';
import { addDays } from '../src/modules/identity/helpers/slug.helper.js';
import { Role } from '../src/modules/identity/enum/role/role.enum.js';

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

  function authHeaders(token: string, tenantId?: string, extra?: HeadersInit): HeadersInit {
    const headers: Record<string, string> = {
      authorization: `Bearer ${token}`,
      ...(extra as Record<string, string> | undefined),
    };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    return headers;
  }

  const password = 'SenhaForte!99';
  const ownerEmail = `s4-notes-${stamp}@example.com`;
  const assistantEmail = `s4-notes-asb-${stamp}@example.com`;
  const receptionEmail = `s4-notes-rec-${stamp}@example.com`;

  const signup = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: ownerEmail,
      password,
      clinicName: 'Clinica Evolucao',
      ownerName: 'Owner Evolucao',
    }),
  });
  console.log('signup', signup.status);
  if (signup.status !== 201) failed = true;
  const token = dataOf(signup).accessToken as string;
  const tenantId = (dataOf(signup).tenant as { id: string }).id;
  const ownerUserId = (dataOf(signup).user as { id: string }).id;
  const membershipId = (dataOf(signup).membership as { id: string }).id;

  const createPatient = await request('/api/v1/patients', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Carlos Lima', phonePrimary: '62999992222' }),
  });
  console.log('patient-create', createPatient.status);
  if (createPatient.status !== 201) failed = true;
  const patientId = (dataOf(createPatient).patient as { id: string }).id;

  const noteWithoutPro = await request(`/api/v1/patients/${patientId}/record/notes`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      content: 'Realizada restauração classe II em 26 com resina composta.',
    }),
  });
  console.log('note-no-professional', noteWithoutPro.status, errorCode(noteWithoutPro));
  if (noteWithoutPro.status !== 422 || errorCode(noteWithoutPro) !== 'BUSINESS_RULE_VIOLATION') {
    failed = true;
  }

  const professional = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ membershipId }),
  });
  console.log('professional-no-cro', professional.status);
  if (professional.status !== 201) failed = true;
  const professionalId = dataOf(professional).id as string;

  const noteNoCro = await request(`/api/v1/patients/${patientId}/record/notes`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      content: 'Realizada restauração classe II em 26 com resina composta.',
    }),
  });
  console.log('note-no-cro', noteNoCro.status, errorCode(noteNoCro));
  if (noteNoCro.status !== 422 || errorCode(noteNoCro) !== 'BUSINESS_RULE_VIOLATION') failed = true;

  const patchCro = await request(`/api/v1/clinic/professionals/${professionalId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ croNumber: '12345', croState: 'GO' }),
  });
  console.log('professional-patch-cro', patchCro.status);
  if (patchCro.status !== 200) failed = true;

  const noteShort = await request(`/api/v1/patients/${patientId}/record/notes`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ content: 'curto' }),
  });
  console.log('note-short', noteShort.status, errorCode(noteShort));
  if (noteShort.status !== 422 || errorCode(noteShort) !== 'BUSINESS_RULE_VIOLATION') failed = true;

  const procedures = await request('/api/v1/procedures', { headers: authHeaders(token, tenantId) });
  const procedureList =
    (procedures.body?.data as Array<{ id: string; defaultMinutes: number }>) ?? [];
  const procedureId = procedureList[0]?.id;
  const duration = procedureList[0]?.defaultMinutes ?? 30;

  const noteContent =
    'Realizada restauração classe II em 26 com resina composta. Anestesia local com lidocaína 2%.';
  const createNote = await request(`/api/v1/patients/${patientId}/record/notes`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      content: noteContent,
      procedures: procedureId ? [{ procedureId, tooth: '26', face: 'O' }] : [],
    }),
  });
  console.log('note-create', createNote.status, dataOf(createNote).version);
  if (createNote.status !== 201 || dataOf(createNote).version !== 1) failed = true;
  if (dataOf(createNote).content !== noteContent) failed = true;
  if (!(dataOf(createNote).contentHash as string)?.startsWith('sha256:')) failed = true;
  const signature = dataOf(createNote).signature as { type?: string; croNumber?: string };
  if (signature?.type !== 'SIMPLE' || signature?.croNumber !== '12345') failed = true;
  const noteId = dataOf(createNote).id as string;

  const listNotes = await request(`/api/v1/patients/${patientId}/record/notes`, {
    headers: authHeaders(token, tenantId),
  });
  const listItems = (dataOf(listNotes).items as Array<Record<string, unknown>>) ?? [];
  console.log('notes-list', listNotes.status, listItems.length);
  if (listNotes.status !== 200 || listItems.length < 1 || listItems[0]?.content !== noteContent) {
    failed = true;
  }

  const prisma = getPrismaClient();
  const tenantDb = getTenantPrisma();
  const smokeCtx = { tenantId, userId: ownerUserId, requestId: 'smoke' };

  const stored = await tenantDb.runInTenantContext(smokeCtx, async (tx) =>
    tx.clinicalNote.findFirst({ where: { id: noteId, tenantId } }),
  );
  console.log('note-encrypted', Boolean(stored?.content && !stored.content.includes('restauração')));
  if (!stored?.content || stored.content.includes('restauração') || stored.content === noteContent) {
    failed = true;
  }
  if (!stored?.contentHash || stored.contentHash.startsWith('sha256:')) failed = true;

  let triggerBlocked = false;
  try {
    await tenantDb.runInTenantContext(smokeCtx, async (tx) => {
      await tx.clinicalNote.update({ where: { id: noteId }, data: { version: 99 } });
    });
  } catch {
    triggerBlocked = true;
  }
  console.log('trigger-update-blocked', triggerBlocked);
  if (!triggerBlocked) failed = true;

  let triggerDeleteBlocked = false;
  try {
    await tenantDb.runInTenantContext(smokeCtx, async (tx) => {
      await tx.clinicalNote.delete({ where: { id: noteId } });
    });
  } catch {
    triggerDeleteBlocked = true;
  }
  console.log('trigger-delete-blocked', triggerDeleteBlocked);
  if (!triggerDeleteBlocked) failed = true;

  const patchNote = await request(`/api/v1/patients/${patientId}/record/notes/${noteId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ content: 'tentativa de editar' }),
  });
  console.log('note-patch', patchNote.status, errorCode(patchNote));
  if (patchNote.status !== 423 || errorCode(patchNote) !== 'RECORD_IMMUTABLE') failed = true;

  const deleteNote = await request(`/api/v1/patients/${patientId}/record/notes/${noteId}`, {
    method: 'DELETE',
    headers: authHeaders(token, tenantId),
  });
  console.log('note-delete', deleteNote.status, errorCode(deleteNote));
  if (deleteNote.status !== 423 || errorCode(deleteNote) !== 'RECORD_IMMUTABLE') failed = true;

  const amendShort = await request(`/api/v1/patients/${patientId}/record/notes/${noteId}/amend`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ content: noteContent + ' correção.', reason: 'curto' }),
  });
  console.log('amend-short', amendShort.status, errorCode(amendShort));
  if (amendShort.status !== 422 || errorCode(amendShort) !== 'BUSINESS_RULE_VIOLATION') failed = true;

  const amendedContent =
    'Realizada restauração classe II em 26 com resina composta. Correção da face oclusal.';
  const amend = await request(`/api/v1/patients/${patientId}/record/notes/${noteId}/amend`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      content: amendedContent,
      reason: 'correção de face do 26',
    }),
  });
  console.log('note-amend', amend.status, dataOf(amend).version, dataOf(amend).supersedesId);
  if (amend.status !== 201 || dataOf(amend).version !== 2) failed = true;
  if (dataOf(amend).supersedesId !== noteId) failed = true;
  if (dataOf(amend).amendReason !== 'correção de face do 26') failed = true;
  const amendId = dataOf(amend).id as string;

  const listAfter = await request(`/api/v1/patients/${patientId}/record/notes`, {
    headers: authHeaders(token, tenantId),
  });
  const afterItems = (dataOf(listAfter).items as Array<Record<string, unknown>>) ?? [];
  console.log('notes-list-after', listAfter.status, afterItems.length, afterItems[0]?.version);
  if (listAfter.status !== 200 || afterItems.length < 2 || afterItems[0]?.id !== amendId) {
    failed = true;
  }

  const clinic = await request('/api/v1/clinic', { headers: authHeaders(token, tenantId) });
  const unitId = (dataOf(clinic).defaultUnit as { id: string }).id;
  const startsAt = '2026-08-17T10:00:00-03:00';
  const endsAt = new Date(new Date(startsAt).getTime() + duration * 60_000).toISOString();

  const appointment = await request('/api/v1/appointments', {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, {
        'content-type': 'application/json',
        'idempotency-key': `notes-${stamp}`,
      }),
    },
    body: JSON.stringify({
      unitId,
      patientId,
      professionalId,
      procedureId,
      startsAt,
      endsAt,
    }),
  });
  console.log('appointment-create', appointment.status, dataOf(appointment).status);
  if (appointment.status !== 201 || dataOf(appointment).status !== 'SCHEDULED') failed = true;
  const appointmentId = dataOf(appointment).id as string;

  const noteWithAppt = await request(`/api/v1/patients/${patientId}/record/notes`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      content: 'Atendimento iniciado. Exame clínico e anamnese revisados em consulta.',
      appointmentId,
    }),
  });
  console.log('note-with-appointment', noteWithAppt.status, dataOf(noteWithAppt).appointmentId);
  if (noteWithAppt.status !== 201 || dataOf(noteWithAppt).appointmentId !== appointmentId) {
    failed = true;
  }

  const apptAfter = await request(`/api/v1/appointments/${appointmentId}`, {
    headers: authHeaders(token, tenantId),
  });
  console.log('appointment-in-service', apptAfter.status, dataOf(apptAfter).status);
  if (apptAfter.status !== 200 || dataOf(apptAfter).status !== 'IN_SERVICE') failed = true;

  const outboxCreated = await tenantDb.runInTenantContext(smokeCtx, async (tx) =>
    tx.outboxEvent.findFirst({
      where: { tenantId, name: 'clinical_records.note_created' },
      orderBy: { occurredAt: 'desc' },
    }),
  );
  const outboxAmended = await tenantDb.runInTenantContext(smokeCtx, async (tx) =>
    tx.outboxEvent.findFirst({
      where: { tenantId, name: 'clinical_records.note_amended' },
      orderBy: { occurredAt: 'desc' },
    }),
  );
  const outboxStarted = await tenantDb.runInTenantContext(smokeCtx, async (tx) =>
    tx.outboxEvent.findFirst({
      where: { tenantId, name: 'scheduling.appointment_started' },
      orderBy: { occurredAt: 'desc' },
    }),
  );
  console.log(
    'outbox',
    Boolean(outboxCreated),
    Boolean(outboxAmended),
    Boolean(outboxStarted),
  );
  if (!outboxCreated || !outboxAmended || !outboxStarted) failed = true;

  async function acceptInvite(email: string, role: string, name: string) {
    const invite = await request('/api/v1/users/invitations', {
      method: 'POST',
      headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    if (invite.status !== 201) failed = true;
    const inviteId = dataOf(invite).id as string;
    const inviteToken = `notes-${role.toLowerCase()}-${stamp}`;
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
  const asbGet = await request(`/api/v1/patients/${patientId}/record/notes`, {
    headers: authHeaders(asbAccess, tenantId),
  });
  console.log('asb-get', asbGet.status);
  if (asbGet.status !== 200) failed = true;
  const asbPost = await request(`/api/v1/patients/${patientId}/record/notes`, {
    method: 'POST',
    headers: { ...authHeaders(asbAccess, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ content: 'Assistente tentando assinar evolução clínica.' }),
  });
  console.log('asb-post', asbPost.status, errorCode(asbPost));
  if (asbPost.status !== 403 || errorCode(asbPost) !== 'FORBIDDEN') failed = true;

  const recAccess = await acceptInvite(receptionEmail, Role.RECEPTION, 'Recepcionista');
  const recGet = await request(`/api/v1/patients/${patientId}/record/notes`, {
    headers: authHeaders(recAccess, tenantId),
  });
  console.log('reception-get', recGet.status, errorCode(recGet));
  if (recGet.status !== 403 || errorCode(recGet) !== 'FORBIDDEN') failed = true;

  server.close();
  await prisma.$disconnect();

  if (failed) {
    console.error('FAIL: clinical notes smoke');
    process.exit(1);
  }
  console.log('OK: clinical notes smoke passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
