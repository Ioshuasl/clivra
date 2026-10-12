import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { getPrismaClient } from '../src/shared/database/tenant_prisma.js';
import { InMemoryJobQueue } from '../src/shared/queue/in_memory_job_queue.js';
import { setJobQueue } from '../src/shared/queue/job_queue_singleton.js';
import { JOB, QUEUE } from '../src/shared/queue/queue_names.js';

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  process.env.NODE_ENV = 'test';
}

type Json = { status: number; body: Record<string, unknown> | null };

async function main() {
  const queue = new InMemoryJobQueue();
  setJobQueue(queue);

  const { createApp } = await import('../src/app.js');
  const { processWhatsappWebhookJob } = await import('../src/modules/messaging/jobs/process_whatsapp_webhook.job.js');
  const { wahaHmacKey } = await import('../src/shared/config/env.js');

  queue.register(QUEUE.messaging, JOB.processWhatsappWebhook, processWhatsappWebhookJob);

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
    if (text && (text.startsWith('<') || text.startsWith('<!'))) {
      throw new Error(`HTML instead of JSON ${res.status} ${path}: ${text.slice(0, 120)}`);
    }
    return { status: res.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null };
  }

  function dataOf(json: Json): Record<string, unknown> {
    return (json.body?.data ?? {}) as Record<string, unknown>;
  }

  function itemsOf(json: Json): Array<Record<string, unknown>> {
    return Array.isArray(json.body?.data) ? (json.body?.data as Array<Record<string, unknown>>) : [];
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
      email: `s7-inbox-${stamp}@example.com`,
      password: 'SenhaForte!99',
      clinicName: 'Clinica Inbox',
      ownerName: 'Owner Inbox',
    }),
  });
  console.log('signup', signup.status);
  if (signup.status !== 201) failed = true;
  const accessToken = dataOf(signup).accessToken as string;
  const tenantId = (dataOf(signup).tenant as { id: string }).id;
  const userId = (dataOf(signup).user as { id: string }).id;

  const connect = await request('/api/v1/messaging/account', {
    method: 'POST',
    headers: { ...authHeaders(accessToken, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ riskAccepted: true }),
  });
  console.log('account_connect', connect.status, dataOf(connect).status);
  if (connect.status !== 201) failed = true;

  const test = await request('/api/v1/messaging/account/test', {
    method: 'POST',
    headers: { ...authHeaders(accessToken, tenantId), 'content-type': 'application/json' },
  });
  console.log('account_test', test.status, dataOf(test).status);
  if (test.status !== 200 || dataOf(test).status !== 'CONNECTED') failed = true;

  const patientPhone = `62981${String(stamp).slice(-6)}`;
  const patient = await request('/api/v1/patients', {
    method: 'POST',
    headers: { ...authHeaders(accessToken, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Maria Inbox', phonePrimary: patientPhone }),
  });
  console.log('patient', patient.status);
  if (patient.status !== 201) failed = true;
  const patientId = (dataOf(patient).patient as { id: string }).id;
  const patientE164 = `55${patientPhone}`;

  const sessionName = `t${tenantId.replace(/-/g, '')}`;
  const wamid = `wamid.inbox.${stamp}`;
  const webhookRaw = JSON.stringify({
    event: 'message',
    session: sessionName,
    payload: {
      id: wamid,
      timestamp: 1755701234,
      from: `${patientE164}@c.us`,
      fromMe: false,
      type: 'text',
      body: 'Oi, quero remarcar',
    },
  });
  const hmac = createHmac('sha512', wahaHmacKey()).update(webhookRaw).digest('hex');
  const webhook = await fetch(`${origin}/api/v1/webhooks/whatsapp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-webhook-hmac': hmac },
    body: webhookRaw,
  });
  console.log('webhook_inbound', webhook.status);
  if (webhook.status !== 200) failed = true;
  await queue.drain();

  const listed = await request('/api/v1/messaging/conversations?unread=true', {
    headers: authHeaders(accessToken, tenantId),
  });
  const conversations = itemsOf(listed);
  const conversation = conversations.find((item) => item.contactPhone === patientE164);
  console.log(
    'list',
    listed.status,
    conversations.length,
    conversation?.patientId,
    conversation?.unreadCount,
    conversation?.status,
  );
  if (
    listed.status !== 200 ||
    !conversation ||
    conversation.patientId !== patientId ||
    Number(conversation.unreadCount) < 1
  ) {
    failed = true;
  }
  const conversationId = conversation?.id as string | undefined;
  if (!conversationId) {
    console.error('FAIL: conversa inbound não encontrada');
    failed = true;
  }

  const got = await request(`/api/v1/messaging/conversations/${conversationId}`, {
    headers: authHeaders(accessToken, tenantId),
  });
  console.log('get', got.status, dataOf(got).id);
  if (got.status !== 200 || dataOf(got).id !== conversationId) failed = true;

  const messages = await request(`/api/v1/messaging/conversations/${conversationId}/messages`, {
    headers: authHeaders(accessToken, tenantId),
  });
  const inbound = itemsOf(messages).find((item) => item.direction === 'INBOUND' && item.body === 'Oi, quero remarcar');
  console.log('messages', messages.status, itemsOf(messages).length, inbound?.id);
  if (messages.status !== 200 || !inbound) failed = true;

  const missingKey = await request(`/api/v1/messaging/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { ...authHeaders(accessToken, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'Horário confirmado.' }),
  });
  console.log('send_missing_key', missingKey.status);
  if (missingKey.status !== 400) failed = true;

  const idempotencyKey = `inbox-send-${stamp}`;
  const send1 = await request(`/api/v1/messaging/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken, tenantId),
      'content-type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ text: 'Horário confirmado.' }),
  });
  const send2 = await request(`/api/v1/messaging/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken, tenantId),
      'content-type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ text: 'Horário confirmado.' }),
  });
  console.log('send', send1.status, send2.status, dataOf(send1).id, dataOf(send2).id);
  if (
    send1.status !== 201 ||
    send2.status !== 201 ||
    dataOf(send1).id !== dataOf(send2).id ||
    dataOf(send1).direction !== 'OUTBOUND'
  ) {
    failed = true;
  }

  const reused = await request(`/api/v1/messaging/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken, tenantId),
      'content-type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ text: 'Outro texto.' }),
  });
  const reusedCode = (reused.body?.error as { code?: string } | undefined)?.code;
  console.log('send_reused', reused.status, reusedCode);
  if (reused.status !== 409 || reusedCode !== 'IDEMPOTENCY_KEY_REUSED') failed = true;

  const afterSend = await request(`/api/v1/messaging/conversations/${conversationId}/messages`, {
    headers: authHeaders(accessToken, tenantId),
  });
  const outboundCount = itemsOf(afterSend).filter((item) => item.direction === 'OUTBOUND' && item.body === 'Horário confirmado.').length;
  console.log('outbound_count', outboundCount);
  if (outboundCount !== 1) failed = true;

  const read = await request(`/api/v1/messaging/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: authHeaders(accessToken, tenantId),
  });
  console.log('read', read.status, dataOf(read).unreadCount);
  if (read.status !== 200 || Number(dataOf(read).unreadCount) !== 0) failed = true;

  const patched = await request(`/api/v1/messaging/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(accessToken, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'PENDING', assignedToUserId: userId }),
  });
  console.log('patch', patched.status, dataOf(patched).status, dataOf(patched).assignedToUserId);
  if (patched.status !== 200 || dataOf(patched).status !== 'PENDING' || dataOf(patched).assignedToUserId !== userId) {
    failed = true;
  }

  const pending = await request('/api/v1/messaging/conversations?status=PENDING', {
    headers: authHeaders(accessToken, tenantId),
  });
  const pendingHit = itemsOf(pending).some((item) => item.id === conversationId);
  console.log('filter_pending', pending.status, pendingHit);
  if (pending.status !== 200 || !pendingHit) failed = true;

  const search = await request(`/api/v1/messaging/conversations?q=${patientPhone}`, {
    headers: authHeaders(accessToken, tenantId),
  });
  const searchHit = itemsOf(search).some((item) => item.id === conversationId);
  console.log('search', search.status, searchHit);
  if (search.status !== 200 || !searchHit) failed = true;

  const other = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `s7-inbox-b-${stamp}@example.com`,
      password: 'SenhaForte!99',
      clinicName: 'Clinica Inbox B',
      ownerName: 'Owner B',
    }),
  });
  const otherToken = dataOf(other).accessToken as string;
  const otherTenantId = (dataOf(other).tenant as { id: string }).id;
  const cross = await request(`/api/v1/messaging/conversations/${conversationId}`, {
    headers: authHeaders(otherToken, otherTenantId),
  });
  console.log('cross_tenant', other.status, cross.status);
  if (other.status !== 201 || cross.status !== 404) failed = true;

  server.close();
  await getPrismaClient().$disconnect();

  if (failed) process.exit(1);
  console.log('OK: messaging inbox smoke passed');
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
