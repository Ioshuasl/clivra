import { once } from 'node:events';
import type { Server } from 'node:http';

// Precisa valer antes de importar o app (lido no boot): um proxy na frente, como no Easypanel.
process.env.TRUST_PROXY = '1';
// Em desenvolvimento o limite por minuto fica desligado; aqui isolamos só o bloqueio por tentativas.
const { createApp } = await import('../src/app.js');
const { getPrismaClient } = await import('../src/shared/database/tenant_prisma.js');

type Json = { status: number; body: Record<string, unknown> | null };

async function main() {
  const server = createApp().listen(0) as Server;
  await once(server, 'listening');
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('no port');
  const origin = `http://127.0.0.1:${addr.port}`;
  const stamp = Date.now();
  let failed = false;

  async function request(path: string, init: RequestInit & { ip?: string } = {}): Promise<Json> {
    const { ip, ...rest } = init;
    const headers = new Headers(rest.headers);
    headers.set('content-type', 'application/json');
    if (ip) headers.set('x-forwarded-for', ip);
    const res = await fetch(`${origin}${path}`, { ...rest, headers });
    const text = await res.text();
    return { status: res.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null };
  }
  const code = (j: Json) => (j.body?.error as { code?: string } | undefined)?.code;
  const check = (label: string, ok: boolean, detail: unknown) => {
    console.log(ok ? 'ok  ' : 'FAIL', label, detail);
    if (!ok) failed = true;
  };

  const email = `throttle-${stamp}@example.com`;
  const password = 'SenhaForte!99';
  const attackerIp = '203.0.113.9';
  const ownerIp = '198.51.100.7';

  const weak = await request('/api/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email: `fraca-${stamp}@example.com`, password: '1', clinicName: 'Clínica Fraca', ownerName: 'Dono Fraco' }),
  });
  check('senha de 1 caractere recusada no cadastro', weak.status === 400, weak.status);

  const nine = await request('/api/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email: `nove-${stamp}@example.com`, password: '123456789', clinicName: 'Clínica Nove', ownerName: 'Dono Nove' }),
  });
  check('senha de 9 caracteres recusada (mínimo 10)', nine.status === 400, nine.status);

  const signup = await request('/api/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, clinicName: `Clínica Throttle ${stamp}`, ownerName: 'Dono Throttle' }),
  });
  check('cadastro com senha forte', signup.status === 201, signup.status);

  const statuses: number[] = [];
  for (let i = 0; i < 5; i += 1) {
    statuses.push((await request('/api/v1/auth/login', { method: 'POST', ip: attackerIp, body: JSON.stringify({ email, password: `errada-${i}` }) })).status);
  }
  check('5 erros do atacante respondem 401', statuses.every((s) => s === 401), statuses.join(','));

  const blocked = await request('/api/v1/auth/login', { method: 'POST', ip: attackerIp, body: JSON.stringify({ email, password: `errada-6` }) });
  check('6ª tentativa do atacante é bloqueada (429)', blocked.status === 429 && code(blocked) === 'RATE_LIMITED', `${blocked.status} ${code(blocked)}`);

  const blockedCorrect = await request('/api/v1/auth/login', { method: 'POST', ip: attackerIp, body: JSON.stringify({ email, password }) });
  check('atacante bloqueado não entra nem com a senha certa', blockedCorrect.status === 429, blockedCorrect.status);

  const owner = await request('/api/v1/auth/login', { method: 'POST', ip: ownerIp, body: JSON.stringify({ email, password }) });
  check('dono, de outro IP, entra normalmente', owner.status === 200, owner.status);

  for (let i = 0; i < 5; i += 1) {
    await request('/api/v1/auth/login', { method: 'POST', ip: attackerIp, body: JSON.stringify({ email: `naoexiste-${stamp}@example.com`, password: `x-${i}` }) });
  }
  const ghost = await request('/api/v1/auth/login', { method: 'POST', ip: attackerIp, body: JSON.stringify({ email: `naoexiste-${stamp}@example.com`, password: 'x' }) });
  check('e-mail inexistente também bloqueia (não revela quem tem conta)', ghost.status === 429, ghost.status);

  await getPrismaClient().$disconnect();
  server.close();
  if (failed) {
    console.error('FAIL: login throttle smoke');
    process.exit(1);
  }
  console.log('SMOKE login-throttle OK');
  process.exit(0);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
