import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';

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

  function authHeaders(token: string, tenantId?: string, extra?: HeadersInit): HeadersInit {
    const headers: Record<string, string> = {
      authorization: `Bearer ${token}`,
      ...(extra as Record<string, string> | undefined),
    };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    return headers;
  }

  const password = 'SenhaForte!99';
  const signup = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `s2-sched-${stamp}@example.com`,
      password,
      clinicName: 'Clinica Agenda',
      ownerName: 'Owner Agenda',
    }),
  });
  console.log('signup', signup.status);
  if (signup.status !== 201) failed = true;

  const token = dataOf(signup).accessToken as string;
  const tenantId = (dataOf(signup).tenant as { id: string }).id;
  const membershipId = (dataOf(signup).membership as { id: string }).id;

  const clinic = await request('/api/v1/clinic', {
    headers: authHeaders(token, tenantId),
  });
  const unitId = (dataOf(clinic).defaultUnit as { id: string }).id;

  const professional = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      membershipId,
      croNumber: '99999',
      croState: 'GO',
    }),
  });
  console.log('professional', professional.status);
  if (professional.status !== 201) failed = true;
  const professionalId = dataOf(professional).id as string;

  const enableChairs = await request('/api/v1/clinic', {
    method: 'PATCH',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ chairsEnabled: true }),
  });
  console.log('chairs-enable', enableChairs.status);
  if (enableChairs.status !== 200) failed = true;

  const chair = await request(`/api/v1/clinic/units/${unitId}/chairs`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Cadeira 1', color: '#3366FF' }),
  });
  console.log('chair-create', chair.status);
  if (chair.status !== 201) failed = true;
  const chairId = dataOf(chair).id as string;

  const chairEmpty = await request(`/api/v1/clinic/units/${unitId}/chairs`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Cadeira 2' }),
  });
  console.log('chair-create-empty', chairEmpty.status);
  if (chairEmpty.status !== 201) failed = true;
  const emptyChairId = dataOf(chairEmpty).id as string;

  const patient = await request('/api/v1/patients', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Ana Souza',
      phonePrimary: '62988880000',
    }),
  });
  console.log('patient', patient.status);
  if (patient.status !== 201) failed = true;
  const patientId = (dataOf(patient).patient as { id: string }).id;

  const procedures = await request('/api/v1/procedures', {
    headers: authHeaders(token, tenantId),
  });
  const procedureList = (procedures.body?.data as Array<{ id: string; defaultMinutes: number }>) ?? [];
  const procedureId = procedureList[0]?.id;
  const duration = procedureList[0]?.defaultMinutes ?? 30;

  // Monday 2026-08-17 10:00 America/Sao_Paulo
  const startsAt = '2026-08-17T10:00:00-03:00';
  const endMs = new Date(startsAt).getTime() + duration * 60_000;
  const endsAt = new Date(endMs).toISOString();

  const create = await request('/api/v1/appointments', {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, {
        'content-type': 'application/json',
        'idempotency-key': `idem-${stamp}`,
      }),
    },
    body: JSON.stringify({
      unitId,
      patientId,
      professionalId,
      procedureId,
      startsAt,
      endsAt,
      notes: 'Primeira consulta',
    }),
  });
  console.log('appointment-create', create.status, dataOf(create).status);
  if (create.status !== 201 || dataOf(create).status !== 'SCHEDULED') failed = true;
  const appointmentId = dataOf(create).id as string;

  const chairStarts = '2026-08-17T16:00:00-03:00';
  const chairEndMs = new Date(chairStarts).getTime() + duration * 60_000;
  const chairEnds = new Date(chairEndMs).toISOString();
  const chairAppt = await request('/api/v1/appointments', {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, {
        'content-type': 'application/json',
        'idempotency-key': `idem-chair-${stamp}`,
      }),
    },
    body: JSON.stringify({
      unitId,
      patientId,
      professionalId,
      chairId,
      procedureId,
      startsAt: chairStarts,
      endsAt: chairEnds,
    }),
  });
  console.log('appointment-chair-create', chairAppt.status, dataOf(chairAppt).chairId);
  if (chairAppt.status !== 201 || dataOf(chairAppt).chairId !== chairId) failed = true;
  const chairAppointmentId = dataOf(chairAppt).id as string;

  const listByChair = await request(
    `/api/v1/appointments?chairId=${chairId}&from=2026-08-17T00:00:00-03:00&to=2026-08-18T00:00:00-03:00`,
    { headers: authHeaders(token, tenantId) },
  );
  const chairItems =
    (listByChair.body?.data as Array<{ id: string; chairId?: string | null }>) ?? [];
  console.log(
    'appointments-by-chair',
    listByChair.status,
    chairItems.length,
    chairItems.every((item) => item.chairId === chairId),
  );
  if (
    listByChair.status !== 200 ||
    chairItems.length < 1 ||
    !chairItems.some((item) => item.id === chairAppointmentId) ||
    chairItems.some((item) => item.chairId !== chairId)
  ) {
    failed = true;
  }

  const listEmptyChair = await request(
    `/api/v1/appointments?chairId=${emptyChairId}&from=2026-08-17T00:00:00-03:00&to=2026-08-18T00:00:00-03:00`,
    { headers: authHeaders(token, tenantId) },
  );
  const emptyChairItems = (listEmptyChair.body?.data as unknown[]) ?? [];
  console.log('appointments-by-chair-empty', listEmptyChair.status, emptyChairItems.length);
  if (listEmptyChair.status !== 200 || emptyChairItems.length !== 0) failed = true;

  const idempotent = await request('/api/v1/appointments', {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, {
        'content-type': 'application/json',
        'idempotency-key': `idem-${stamp}`,
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
  console.log('appointment-idempotent', idempotent.status, dataOf(idempotent).id === appointmentId);
  if (idempotent.status !== 201 || dataOf(idempotent).id !== appointmentId) failed = true;

  const conflictStarts = '2026-08-17T10:15:00-03:00';
  const conflictEnds = '2026-08-17T10:45:00-03:00';
  const conflict = await request('/api/v1/appointments', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      unitId,
      patientId,
      professionalId,
      startsAt: conflictStarts,
      endsAt: conflictEnds,
    }),
  });
  console.log(
    'appointment-conflict',
    conflict.status,
    (conflict.body?.error as { code?: string })?.code,
  );
  if (conflict.status !== 409) failed = true;

  // 20 concurrent creates on a free slot
  const raceStarts = '2026-08-17T14:00:00-03:00';
  const raceEnds = '2026-08-17T14:30:00-03:00';
  const race = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      request('/api/v1/appointments', {
        method: 'POST',
        headers: {
          ...authHeaders(token, tenantId, {
            'content-type': 'application/json',
            'idempotency-key': `race-${stamp}-${i}`,
          }),
        },
        body: JSON.stringify({
          unitId,
          patientId,
          professionalId,
          startsAt: raceStarts,
          endsAt: raceEnds,
        }),
      }),
    ),
  );
  const successes = race.filter((r) => r.status === 201).length;
  const conflicts = race.filter((r) => r.status === 409).length;
  console.log('concurrent-slot', successes, conflicts);
  if (successes !== 1 || conflicts !== 19) failed = true;

  const availability = await request(
    `/api/v1/availability?professionalId=${professionalId}&date=2026-08-17&durationMinutes=30`,
    { headers: authHeaders(token, tenantId) },
  );
  const slots = (dataOf(availability).slots as Array<{ available: boolean }>) ?? [];
  console.log('availability', availability.status, slots.length, slots.filter((s) => s.available).length);
  if (availability.status !== 200 || slots.length === 0) failed = true;

  const statusConfirm = await request(`/api/v1/appointments/${appointmentId}/status`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'CONFIRMED' }),
  });
  console.log('status-confirm', statusConfirm.status, dataOf(statusConfirm).status);
  if (statusConfirm.status !== 200 || dataOf(statusConfirm).status !== 'CONFIRMED') failed = true;

  const invalid = await request(`/api/v1/appointments/${appointmentId}/status`, {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'COMPLETED' }),
  });
  console.log(
    'status-invalid',
    invalid.status,
    (invalid.body?.error as { code?: string })?.code,
  );
  if (invalid.status !== 409) failed = true;

  const history = await request(`/api/v1/appointments/${appointmentId}/history`, {
    headers: authHeaders(token, tenantId),
  });
  const historyItems = (history.body?.data as unknown[]) ?? [];
  console.log('history', history.status, historyItems.length);
  if (history.status !== 200 || historyItems.length < 2) failed = true;

  // Bloqueio sobre slot com agendamento (race 14:00) — lista conflitos, não cancela
  const block = await request('/api/v1/schedule-blocks', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      unitId,
      professionalId,
      startsAt: raceStarts,
      endsAt: raceEnds,
      reason: 'Reunião clínica',
    }),
  });
  const blockConflicts = (dataOf(block).conflicts as unknown[]) ?? [];
  console.log('schedule-block', block.status, blockConflicts.length);
  if (block.status !== 201 || blockConflicts.length < 1) failed = true;
  const blockId = dataOf(block).id as string;

  const chairBlock = await request('/api/v1/schedule-blocks', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      unitId,
      chairId,
      startsAt: chairStarts,
      endsAt: chairEnds,
      reason: 'Manutenção cadeira',
    }),
  });
  const chairBlockConflicts = (dataOf(chairBlock).conflicts as unknown[]) ?? [];
  console.log('schedule-block-chair', chairBlock.status, chairBlockConflicts.length);
  if (chairBlock.status !== 201 || chairBlockConflicts.length < 1) failed = true;

  const delBlock = await request(`/api/v1/schedule-blocks/${blockId}`, {
    method: 'DELETE',
    headers: authHeaders(token, tenantId),
  });
  console.log('schedule-block-delete', delBlock.status);
  if (delBlock.status !== 200) failed = true;

  // Série semanal — máx. 12 ocorrências
  const series = await request('/api/v1/appointment-series', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      unitId,
      patientId,
      professionalId,
      procedureId,
      rrule: 'FREQ=WEEKLY;INTERVAL=1',
      startsAt: '2026-08-17T11:00:00-03:00',
      durationMinutes: 30,
    }),
  });
  const seriesAppts = (dataOf(series).appointments as unknown[]) ?? [];
  console.log('series-create', series.status, seriesAppts.length);
  if (series.status !== 201 || seriesAppts.length !== 12) failed = true;
  const seriesId = dataOf(series).id as string;
  const firstSeriesApptId = (seriesAppts[0] as { id: string }).id;
  const secondSeriesApptId = (seriesAppts[1] as { id: string }).id;

  const delThis = await request(
    `/api/v1/appointment-series/${seriesId}?scope=THIS&appointmentId=${firstSeriesApptId}&reason=Remarcar`,
    { method: 'DELETE', headers: authHeaders(token, tenantId) },
  );
  console.log('series-delete-this', delThis.status, dataOf(delThis).cancelledCount);
  if (delThis.status !== 200 || dataOf(delThis).cancelledCount !== 1) failed = true;

  const delFuture = await request(
    `/api/v1/appointment-series/${seriesId}?scope=FUTURE&appointmentId=${secondSeriesApptId}&reason=Encerrar serie`,
    { method: 'DELETE', headers: authHeaders(token, tenantId) },
  );
  console.log('series-delete-future', delFuture.status, dataOf(delFuture).cancelledCount);
  if (delFuture.status !== 200 || Number(dataOf(delFuture).cancelledCount) < 1) failed = true;

  const timeline = await request(`/api/v1/patients/${patientId}/timeline`, {
    headers: authHeaders(token, tenantId),
  });
  const timelineItems = (dataOf(timeline).items as Array<{ source: string }>) ?? [];
  const included = (dataOf(timeline).includedSources as string[]) ?? [];
  console.log(
    'timeline',
    timeline.status,
    timelineItems.length,
    included.includes('APPOINTMENT'),
    timelineItems.every((i) => i.source !== 'CLINICAL'),
  );
  if (
    timeline.status !== 200 ||
    !included.includes('APPOINTMENT') ||
    timelineItems.length < 1 ||
    timelineItems.some((i) => i.source === 'CLINICAL')
  ) {
    failed = true;
  }

  const cancel = await request(`/api/v1/appointments/${appointmentId}`, {
    method: 'DELETE',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ reason: 'Paciente desmarcOu' }),
  });
  console.log('cancel', cancel.status, dataOf(cancel).status);
  if (cancel.status !== 200 || dataOf(cancel).status !== 'CANCELLED') failed = true;

  server.close();
  if (failed) {
    console.error('smoke-scheduling FAILED');
    process.exit(1);
  }
  console.log('smoke-scheduling OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
