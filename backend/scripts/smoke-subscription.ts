import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { getPrismaClient, getTenantPrisma } from '../src/shared/database/tenant_prisma.js';
import { trialExpireJob } from '../src/modules/subscription/jobs/trial_expire.job.js';
import { setBillingAdapter } from '../src/modules/subscription/adapters/billing_adapter.factory.js';
import { ManualBillingAdapter } from '../src/modules/subscription/adapters/manual_billing.adapter.js';

type Json = { status: number; body: Record<string, unknown> | null };

async function main() {
  // Este smoke cobre o fluxo manual (BILLING_PROVIDER=manual), mesmo que o .env local use o Asaas.
  setBillingAdapter(new ManualBillingAdapter());
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

  const password = 'SenhaForte!99';
  const signup = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `s7-sub-${stamp}@example.com`,
      password,
      clinicName: 'Clinica Subscription S7',
      ownerName: 'Owner Sub',
    }),
  });
  console.log('signup', signup.status);
  if (signup.status !== 201) failed = true;
  const token = dataOf(signup).accessToken as string;
  const tenantId = (dataOf(signup).tenant as { id: string }).id;
  const ownerUserId = (dataOf(signup).user as { id: string }).id;
  const membershipId = (dataOf(signup).membership as { id: string }).id;
  const smokeCtx = { tenantId, userId: ownerUserId, requestId: 'smoke-subscription' };

  const sub = await request('/api/v1/subscription', { headers: authHeaders(token, tenantId) });
  console.log('GET /subscription', sub.status, dataOf(sub).status);
  if (sub.status !== 200 || dataOf(sub).status !== 'TRIAL') failed = true;
  const plan = dataOf(sub).plan as { code?: string } | undefined;
  if (plan?.code !== 'ESSENCIAL') failed = true;

  const plans = await request('/api/v1/subscription/plans', {
    headers: authHeaders(token, tenantId),
  });
  console.log('GET /plans', plans.status);
  const planList = (plans.body?.data as Array<{ code: string }>) ?? [];
  if (plans.status !== 200 || planList.length < 3) failed = true;

  const usage = await request('/api/v1/subscription/usage', {
    headers: authHeaders(token, tenantId),
  });
  console.log('GET /usage', usage.status);
  if (usage.status !== 200) failed = true;

  const checkout = await request('/api/v1/subscription/checkout', {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId),
      'content-type': 'application/json',
      'idempotency-key': `smoke-${stamp}`,
    },
    body: JSON.stringify({ planCode: 'CLINICA', billingMethod: 'PIX' }),
  });
  console.log('POST /checkout', checkout.status, errorCode(checkout));
  // BILLING_PROVIDER=manual (padrão): checkout automático fica indisponível (ADR-0017, kill switch)
  if (checkout.status !== 503 || errorCode(checkout) !== 'BILLING_UNAVAILABLE') failed = true;

  const pro1 = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ membershipId, croNumber: '11111', croState: 'GO' }),
  });
  console.log('professional #1', pro1.status);
  if (pro1.status !== 201) failed = true;

  const secondMembershipId = randomUUID();
  const secondUserId = randomUUID();
  await tenantDb.runProvisioning(async (tx) => {
    await tx.user.create({
      data: {
        id: secondUserId,
        email: `s7-sub-pro2-${stamp}@example.com`,
        name: 'Pro2',
        passwordHash: 'x',
      },
    });
  });
  await tenantDb.runInTenantContext(smokeCtx, async (tx) => {
    await tx.membership.create({
      data: {
        id: secondMembershipId,
        tenantId,
        userId: secondUserId,
        role: 'DENTIST',
        active: true,
        permissions: {},
      },
    });
  });

  const pro2 = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      membershipId: secondMembershipId,
      croNumber: '22222',
      croState: 'GO',
    }),
  });
  console.log('professional #2 (limit)', pro2.status, errorCode(pro2));
  if (pro2.status !== 402 || errorCode(pro2) !== 'PLAN_LIMIT_EXCEEDED') failed = true;

  const suspend = await request('/api/v1/subscription/ops/status', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'SUSPENDED', reason: 'smoke test' }),
  });
  console.log('ops SUSPENDED', suspend.status, dataOf(suspend).status);
  if (suspend.status !== 200 || dataOf(suspend).status !== 'SUSPENDED') failed = true;

  const automations = await tenantDb.runInTenantContext(smokeCtx, (tx) =>
    tx.automation.findMany({ where: { tenantId } }),
  );
  if (automations.some((a) => a.enabled)) {
    console.log('FAIL: automations still enabled after suspend');
    failed = true;
  }

  const patientWrite = await request('/api/v1/patients', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Bloqueado',
      phonePrimary: '62977770001',
      birthDate: '1990-01-01',
    }),
  });
  console.log('write while SUSPENDED', patientWrite.status, errorCode(patientWrite));
  if (patientWrite.status !== 402 || errorCode(patientWrite) !== 'SUBSCRIPTION_REQUIRED') {
    failed = true;
  }

  const patientsGet = await request('/api/v1/patients', {
    headers: authHeaders(token, tenantId),
  });
  console.log('GET patients while SUSPENDED', patientsGet.status);
  if (patientsGet.status !== 200) failed = true;

  const reactivate = await request('/api/v1/subscription/ops/status', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'TRIAL', reason: 'reactivate for trial-expire' }),
  });
  if (reactivate.status !== 200) failed = true;

  await tenantDb.runInTenantContext(smokeCtx, async (tx) => {
    await tx.subscription.update({
      where: { tenantId },
      data: { status: 'TRIAL', trialEndsAt: new Date(Date.now() - 60_000) },
    });
    await tx.tenant.update({
      where: { id: tenantId },
      data: { status: 'TRIAL', trialEndsAt: new Date(Date.now() - 60_000) },
    });
  });

  await trialExpireJob({
    tenantId,
    requestId: 'smoke-trial-expire',
  });

  const afterExpire = await request('/api/v1/subscription', {
    headers: authHeaders(token, tenantId),
  });
  console.log('after trial-expire', afterExpire.status, dataOf(afterExpire).status);
  if (dataOf(afterExpire).status !== 'EXPIRED') failed = true;

  const writeExpired = await request('/api/v1/patients', {
    method: 'POST',
    headers: { ...authHeaders(token, tenantId), 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Ainda Bloqueado',
      phonePrimary: '62977770002',
      birthDate: '1990-01-01',
    }),
  });
  console.log('write while EXPIRED', writeExpired.status, errorCode(writeExpired));
  if (writeExpired.status !== 402 || errorCode(writeExpired) !== 'SUBSCRIPTION_REQUIRED') {
    failed = true;
  }

  server.close();
  await prisma.$disconnect();

  if (failed) {
    console.error('SMOKE subscription FAILED');
    process.exit(1);
  }
  console.log('SMOKE subscription OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
