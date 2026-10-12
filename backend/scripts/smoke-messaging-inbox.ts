import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { getPrismaClient, getTenantPrisma } from '../src/shared/database/tenant_prisma.js';
import { InMemoryJobQueue } from '../src/shared/queue/in_memory_job_queue.js';
import { setJobQueue } from '../src/shared/queue/job_queue_singleton.js';
import { JOB, QUEUE } from '../src/shared/queue/queue_names.js';
import { idGenerator } from '../src/shared/helpers/id_generator.js';
import { getObjectStorage } from '../src/shared/storage/index.js';
import { getMessagingProvider, FakeMessagingProvider } from '../src/shared/integrations/whatsapp/index.js';

process.env.STORAGE_FAKE = '1';
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  process.env.NODE_ENV = 'test';
}

type Json = { status: number; body: Record<string, unknown> | null };

async function main() {
  const queue = new InMemoryJobQueue();
  setJobQueue(queue);

  const { createApp } = await import('../src/app.js');
  const { processWhatsappWebhookJob } = await import(
    '../src/modules/messaging/jobs/process_whatsapp_webhook.job.js'
  );

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

  function authHeaders(token: string, tenantId: string, extra?: HeadersInit): HeadersInit {
    return {
      authorization: `Bearer ${token}`,
      'x-tenant-id': tenantId,
      ...(extra as Record<string, string> | undefined),
    };
  }

  try {
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

    const connect = await request('/api/v1/messaging/account', {
      method: 'POST',
      headers: { ...authHeaders(accessToken, tenantId), 'content-type': 'application/json' },
      body: JSON.stringify({ riskAccepted: true }),
    });
    console.log('account_connect', connect.status, dataOf(connect).status);
    if (connect.status !== 201) failed = true;

    const test = await request('/api/v1/messaging/account/test', {
      method: 'POST',
      headers: {
        ...authHeaders(accessToken, tenantId),
        'content-type': 'application/json',
        'Idempotency-Key': `inbox-test-${stamp}`,
      },
    });
    console.log('account_test', test.status, dataOf(test).status);
    if (test.status !== 200 || dataOf(test).status !== 'CONNECTED') failed = true;

    const patientPhone = `62982${String(stamp).slice(-6)}`;
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
        timestamp: Math.floor(Date.now() / 1000),
        from: `${patientE164}@c.us`,
        fromMe: false,
        type: 'chat',
        body: 'Oi, preciso remarcar',
      },
    });
    const hmac = createHmac('sha512', process.env.WAHA_HMAC_KEY ?? process.env.WHATSAPP_APP_SECRET ?? '')
      .update(webhookRaw)
      .digest('hex');

    const webhook = await fetch(`${origin}/api/v1/webhooks/whatsapp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-webhook-hmac': hmac },
      body: webhookRaw,
    });
    console.log('webhook_inbound', webhook.status);
    if (webhook.status !== 200) failed = true;
    await queue.drain();

    const list = await request('/api/v1/messaging/conversations?status=OPEN&unread=true', {
      headers: authHeaders(accessToken, tenantId),
    });
    const items = Array.isArray(list.body?.data)
      ? (list.body?.data as Array<Record<string, unknown>>)
      : [];
    console.log('conversations_list', list.status, items.length);
    if (list.status !== 200 || items.length < 1) failed = true;

    const conversation = items.find((c) => c.contactPhone === patientE164) ?? items[0];
    const conversationId = conversation?.id as string | undefined;
    if (!conversationId) {
      console.error('FAIL: conversa não encontrada');
      failed = true;
    } else {
      if (Number(conversation.unreadCount) < 1) {
        console.error('FAIL: unreadCount deveria incrementar no inbound');
        failed = true;
      }
      if (conversation.patientId !== patientId) {
        console.error('FAIL: patientId deveria vincular por telefone', conversation.patientId, patientId);
        failed = true;
      }

      const get = await request(`/api/v1/messaging/conversations/${conversationId}`, {
        headers: authHeaders(accessToken, tenantId),
      });
      console.log('conversation_get', get.status);
      if (get.status !== 200 || dataOf(get).id !== conversationId) failed = true;

      const messagesBefore = await request(`/api/v1/messaging/conversations/${conversationId}/messages`, {
        headers: authHeaders(accessToken, tenantId),
      });
      const inboundMsgs = Array.isArray(messagesBefore.body?.data)
        ? (messagesBefore.body?.data as Array<{ direction?: string }>)
        : [];
      console.log('messages_list', messagesBefore.status, inboundMsgs.length);
      if (messagesBefore.status !== 200 || !inboundMsgs.some((m) => m.direction === 'INBOUND')) {
        failed = true;
      }

      const missingKey = await request(`/api/v1/messaging/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { ...authHeaders(accessToken, tenantId), 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'Sem chave' }),
      });
      console.log('send_missing_idempotency', missingKey.status);
      if (missingKey.status !== 400) failed = true;

      const sendKey = `inbox-send-${stamp}`;
      const send1 = await request(`/api/v1/messaging/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          ...authHeaders(accessToken, tenantId),
          'content-type': 'application/json',
          'Idempotency-Key': sendKey,
        },
        body: JSON.stringify({ text: 'Olá Maria, podemos remarcar amanhã?' }),
      });
      const send2 = await request(`/api/v1/messaging/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          ...authHeaders(accessToken, tenantId),
          'content-type': 'application/json',
          'Idempotency-Key': sendKey,
        },
        body: JSON.stringify({ text: 'Olá Maria, podemos remarcar amanhã?' }),
      });
      console.log('send_idempotent', send1.status, send2.status, dataOf(send1).id, dataOf(send2).id);
      if (send1.status !== 201 || send2.status !== 201) failed = true;
      if (dataOf(send1).id !== dataOf(send2).id) {
        console.error('FAIL: duplo POST deveria devolver a mesma mensagem');
        failed = true;
      }

      const conflict = await request(`/api/v1/messaging/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          ...authHeaders(accessToken, tenantId),
          'content-type': 'application/json',
          'Idempotency-Key': sendKey,
        },
        body: JSON.stringify({ text: 'Payload diferente' }),
      });
      console.log('send_idempotency_conflict', conflict.status, (conflict.body?.error as { code?: string } | undefined)?.code);
      if (conflict.status !== 409) failed = true;

      const patch = await request(`/api/v1/messaging/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { ...authHeaders(accessToken, tenantId), 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'PENDING' }),
      });
      console.log('conversation_patch', patch.status, dataOf(patch).status);
      if (patch.status !== 200 || dataOf(patch).status !== 'PENDING') failed = true;

      const pendingList = await request('/api/v1/messaging/conversations?status=PENDING', {
        headers: authHeaders(accessToken, tenantId),
      });
      const pendingItems = Array.isArray(pendingList.body?.data)
        ? (pendingList.body?.data as Array<{ id?: string }>)
        : [];
      console.log('conversations_pending', pendingList.status, pendingItems.length);
      if (pendingList.status !== 200 || !pendingItems.some((c) => c.id === conversationId)) {
        failed = true;
      }

      const read = await request(`/api/v1/messaging/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: authHeaders(accessToken, tenantId),
      });
      console.log('conversation_read', read.status, dataOf(read).unreadCount);
      if (read.status !== 200 || Number(dataOf(read).unreadCount) !== 0) failed = true;

      const search = await request(
        `/api/v1/messaging/conversations?q=${encodeURIComponent('Maria Inbox')}`,
        { headers: authHeaders(accessToken, tenantId) },
      );
      const searchItems = Array.isArray(search.body?.data)
        ? (search.body?.data as Array<{ id?: string }>)
        : [];
      console.log('conversations_search', search.status, searchItems.length);
      if (search.status !== 200 || !searchItems.some((c) => c.id === conversationId)) {
        failed = true;
      }

      const byPatient = await request(
        `/api/v1/messaging/conversations?patientId=${encodeURIComponent(patientId)}`,
        { headers: authHeaders(accessToken, tenantId) },
      );
      const byPatientItems = Array.isArray(byPatient.body?.data)
        ? (byPatient.body?.data as Array<{ id?: string; patientId?: string }>)
        : [];
      console.log('conversations_by_patient', byPatient.status, byPatientItems.length);
      if (
        byPatient.status !== 200 ||
        !byPatientItems.some((c) => c.id === conversationId && c.patientId === patientId)
      ) {
        failed = true;
      }

      const presign = await request('/api/v1/messaging/media/presign', {
        method: 'POST',
        headers: { ...authHeaders(accessToken, tenantId), 'content-type': 'application/json' },
        body: JSON.stringify({
          fileName: 'receita.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 128,
        }),
      });
      const storageKey = dataOf(presign).storageKey as string | undefined;
      console.log('media_presign', presign.status, Boolean(storageKey));
      if (presign.status !== 200 || !storageKey) failed = true;
      else {
        await getObjectStorage().putObject(storageKey, Buffer.from('%PDF-1.4 smoke'), 'application/pdf');
        const mediaKey = `inbox-media-${stamp}`;
        const mediaSend = await request(`/api/v1/messaging/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            ...authHeaders(accessToken, tenantId),
            'content-type': 'application/json',
            'Idempotency-Key': mediaKey,
          },
          body: JSON.stringify({ text: 'Segue receita', mediaStorageKey: storageKey }),
        });
        console.log('media_send', mediaSend.status, dataOf(mediaSend).type, dataOf(mediaSend).mediaKey);
        if (
          mediaSend.status !== 201 ||
          dataOf(mediaSend).type !== 'DOCUMENT' ||
          dataOf(mediaSend).mediaKey !== storageKey
        ) {
          failed = true;
        }
        const provider = getMessagingProvider();
        if (provider instanceof FakeMessagingProvider && provider.sentFiles.length < 1) {
          console.error('FAIL: fake WAHA deveria registrar sendFile');
          failed = true;
        }
      }

      const streamRes = await fetch(`${origin}/api/v1/stream`, {
        headers: authHeaders(accessToken, tenantId),
      });
      console.log('stream_open', streamRes.status, streamRes.headers.get('content-type'));
      if (streamRes.status !== 200 || !String(streamRes.headers.get('content-type') ?? '').includes('text/event-stream')) {
        failed = true;
      } else {
        const reader = streamRes.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const deadline = Date.now() + 3000;
        while (reader && Date.now() < deadline && !buffer.includes('event: ready')) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
        }
        console.log('stream_ready', buffer.includes('event: ready'));
        if (!buffer.includes('event: ready')) failed = true;
        await reader?.cancel().catch(() => undefined);
      }
    }

    const prisma = getPrismaClient();
    await getTenantPrisma().runInTenantContext(
      { tenantId, userId: '', requestId: idGenerator.next() },
      async (tx) => {
        const count = await tx.message.count({
          where: { tenantId, direction: 'OUTBOUND', body: 'Olá Maria, podemos remarcar amanhã?' },
        });
        console.log('outbound_persisted', count);
        if (count !== 1) {
          console.error('FAIL: deveria persistir exatamente 1 outbound idempotente');
          failed = true;
        }
      },
    );

    await prisma.$disconnect().catch(() => undefined);
  } finally {
    server.close();
  }

  if (failed) {
    console.error('smoke-messaging-inbox FAILED');
    process.exit(1);
  }
  console.log('smoke-messaging-inbox OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
