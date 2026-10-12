import { once } from 'node:events';
import type { Server } from 'node:http';
import { AsaasFakeServer } from './asaas_fake_server.js';

export type Json = { status: number; body: Record<string, unknown> | null };

export const WEBHOOK_TOKEN = 'smoke-webhook-token-0123456789abcdef0123456789';

/**
 * Sobe o Asaas fake + a API do app com `BILLING_PROVIDER=asaas` apontando para ele.
 * As variáveis precisam existir ANTES de importar o app (o `env` é lido no import), por isso o import dinâmico.
 */
export async function bootAsaasSmoke(name: string) {
  const fake = new AsaasFakeServer();
  const fakeOrigin = await fake.start();

  process.env.NODE_ENV = 'test';
  process.env.BILLING_PROVIDER = 'asaas';
  process.env.ASAAS_ENV = 'sandbox';
  process.env.ASAAS_API_KEY = fake.apiKey;
  process.env.ASAAS_WEBHOOK_TOKEN = WEBHOOK_TOKEN;
  process.env.ASAAS_BASE_URL = `${fakeOrigin}/v3`;

  const { createApp } = await import('../../src/app.js');
  const server = createApp().listen(0) as Server;
  await once(server, 'listening');
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('sem porta');
  const origin = `http://127.0.0.1:${addr.port}`;

  let failures = 0;
  const jar = new Map<string, string>();

  async function request(path: string, init: RequestInit = {}): Promise<Json> {
    const headers = new Headers(init.headers);
    if (jar.size > 0) headers.set('cookie', [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '));
    const res = await fetch(`${origin}${path}`, { ...init, headers });
    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
    const text = await res.text();
    return { status: res.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null };
  }

  function check(label: string, ok: boolean, detail?: unknown): void {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok || detail === undefined ? '' : ` -> ${JSON.stringify(detail, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))}`}`);
    if (!ok) failures += 1;
  }

  function dataOf(json: Json): Record<string, unknown> {
    return (json.body?.data ?? {}) as Record<string, unknown>;
  }

  function errorCode(json: Json): string | undefined {
    return (json.body?.error as { code?: string } | undefined)?.code;
  }

  async function signupOwner(label: string) {
    const res = await request('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `${name}-${label}-${Date.now()}@example.com`,
        password: 'SenhaForte!99',
        clinicName: `Clinica ${name} ${label}`,
        ownerName: 'Owner Billing',
      }),
    });
    if (res.status !== 201) throw new Error(`signup falhou: ${res.status}`);
    const data = dataOf(res);
    return {
      token: data.accessToken as string,
      tenantId: (data.tenant as { id: string }).id,
      userId: (data.user as { id: string }).id,
    };
  }

  function authHeaders(owner: { token: string; tenantId: string }, extra: Record<string, string> = {}) {
    return {
      authorization: `Bearer ${owner.token}`,
      'x-tenant-id': owner.tenantId,
      'content-type': 'application/json',
      ...extra,
    };
  }

  async function close(): Promise<void> {
    server.close();
    await fake.stop();
    const { getPrismaClient } = await import('../../src/shared/database/tenant_prisma.js');
    await getPrismaClient().$disconnect();
  }

  function finish(): never {
    console.log(failures === 0 ? `SMOKE ${name} OK` : `SMOKE ${name} FAILED (${failures})`);
    process.exit(failures === 0 ? 0 : 1);
  }

  return { fake, origin, request, check, dataOf, errorCode, signupOwner, authHeaders, close, finish };
}
