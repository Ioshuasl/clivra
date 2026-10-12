/**
 * Roteiro de homologação no Asaas SANDBOX (S9 Bloco 7). Usa o app real (API em HOMOLOG_API_URL,
 * padrão http://localhost:3333, já com BILLING_PROVIDER=asaas) e o próprio cliente do Asaas só para
 * simular o pagamento. Nunca imprime chave nem token.
 *
 * Pré-requisitos: API rodando com ASAAS_ENV=sandbox, webhook do Asaas apontando para a API (túnel).
 * Uso: pnpm --filter @repo/backend exec tsx scripts/homolog-asaas-sandbox.ts
 */
import { env } from '../src/shared/config/env.js';

const API = process.env.HOMOLOG_API_URL ?? 'http://localhost:3333';
const CPF = process.env.HOMOLOG_CPF ?? '24971563792';
const WAIT_WEBHOOK_MS = Number(process.env.HOMOLOG_WAIT_MS ?? 45_000);

type Json = { status: number; body: Record<string, unknown> | null };
let failures = 0;

function check(label: string, ok: boolean, detail?: unknown): void {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok || detail === undefined ? '' : ` -> ${JSON.stringify(detail)}`}`);
  if (!ok) failures += 1;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const data = (res: Json) => (res.body?.data ?? {}) as Record<string, unknown>;
const code = (res: Json) => (res.body?.error as { code?: string } | undefined)?.code;

async function http(path: string, init: RequestInit = {}): Promise<Json> {
  const res = await fetch(`${API}/api/v1${path}`, init);
  const text = await res.text();
  return { status: res.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null };
}

async function signup(label: string) {
  const res = await http('/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `homolog-${label}-${Date.now()}@example.com`,
      password: 'SenhaForte!99',
      clinicName: `Homolog ${label} ${new Date().toISOString().slice(0, 16)}`,
      ownerName: 'Owner Homolog',
    }),
  });
  if (res.status !== 201) throw new Error(`signup falhou: ${res.status} ${JSON.stringify(res.body)}`);
  const d = data(res);
  return { token: d.accessToken as string, tenantId: (d.tenant as { id: string }).id };
}

type Session = Awaited<ReturnType<typeof signup>>;
const auth = (s: Session, extra: Record<string, string> = {}) => ({
  authorization: `Bearer ${s.token}`,
  'x-tenant-id': s.tenantId,
  'content-type': 'application/json',
  ...extra,
});

async function main() {
  if (env.BILLING_PROVIDER !== 'asaas' || env.ASAAS_ENV !== 'sandbox') {
    console.error('Abortado: este roteiro só roda com BILLING_PROVIDER=asaas e ASAAS_ENV=sandbox.');
    process.exit(2);
  }
  const { AsaasClient } = await import('../src/shared/integrations/asaas/asaas.client.js');
  const { getPrismaClient } = await import('../src/shared/database/tenant_prisma.js');
  const { AsaasEventRepository } = await import('../src/modules/subscription/repositories/asaas_event/asaas_event.repository.js');
  const { ProcessAsaasEventAction } = await import('../src/modules/subscription/actions/subscription/asaas_event_process.action.js');
  const asaas = new AsaasClient();
  const prisma = getPrismaClient();
  const events = new AsaasEventRepository();
  const run = Date.now();
  const seenEvents: Array<{ event: string; status: string; keys: string[] }> = [];

  // ───────────── 1. Assinar por Pix ─────────────
  console.log('\n— 1. Pix: checkout, QR Code e pagamento simulado —');
  const A = await signup('pix');
  const sub0 = await http('/subscription', { headers: auth(A) });
  check('GET /subscription: TRIAL com pagamento online ligado', data(sub0).status === 'TRIAL' && data(sub0).checkoutAvailable === true, data(sub0));

  const key = `homolog-${run}-pix`;
  const checkout = await http('/subscription/checkout', {
    method: 'POST',
    headers: auth(A, { 'idempotency-key': key }),
    body: JSON.stringify({ planCode: 'CLINICA', billingMethod: 'PIX', cpfCnpj: CPF }),
  });
  const payment = data(checkout).payment as { id: string; valueCents: number; dueDate: string; pix?: { qrCodeBase64: string; payload: string } } | undefined;
  check('checkout Pix → 201', checkout.status === 201, checkout.body);
  check('QR Code e copia e cola vieram do Asaas', Boolean(payment?.pix?.qrCodeBase64) && (payment?.pix?.payload ?? '').startsWith('000201'), payment && { id: payment.id, hasPix: Boolean(payment.pix) });
  check('valor do plano Clínica (R$ 199,00)', payment?.valueCents === 19900, payment?.valueCents);
  if (!payment) throw new Error('sem cobrança — não dá para continuar');

  const asaasPayment = await asaas.request<Record<string, unknown>>('GET', `/payments/${payment.id}`);
  const asaasSubId = String(asaasPayment.subscription ?? '');
  const asaasSub = await asaas.request<Record<string, unknown>>('GET', `/subscriptions/${asaasSubId}`);
  check('no Asaas: assinatura mensal com externalReference = tenant', asaasSub.cycle === 'MONTHLY' && asaasSub.externalReference === A.tenantId && asaasSub.billingType === 'PIX', { cycle: asaasSub.cycle, billingType: asaasSub.billingType, ref: asaasSub.externalReference === A.tenantId });
  const asaasCustomer = await asaas.request<Record<string, unknown>>('GET', `/customers/${String(asaasSub.customer)}`);
  check('no Asaas: cliente com externalReference = tenant', asaasCustomer.externalReference === A.tenantId);

  const replay = await http('/subscription/checkout', {
    method: 'POST',
    headers: auth(A, { 'idempotency-key': key }),
    body: JSON.stringify({ planCode: 'CLINICA', billingMethod: 'PIX', cpfCnpj: CPF }),
  });
  check('replay com a mesma chave não duplica no Asaas', replay.status === 201 && (await asaas.request<{ data: unknown[] }>('GET', '/subscriptions', { query: { customer: String(asaasSub.customer) } })).data.length === 1);

  const today = new Date().toISOString().slice(0, 10);
  const confirm = await asaas.request<Record<string, unknown>>('POST', `/payments/${payment.id}/receiveInCash`, {
    body: { paymentDate: today, value: 199, notifyCustomer: false },
  });
  check('pagamento confirmado no sandbox', ['RECEIVED', 'RECEIVED_IN_CASH', 'CONFIRMED'].includes(String(confirm.status)), confirm.status);

  // ───────────── 2. Webhook chega pelo túnel e ativa ─────────────
  console.log('\n— 2. Webhook (túnel) e ativação —');
  const deadline = Date.now() + WAIT_WEBHOOK_MS;
  let rows: Array<{ id: string; asaas_event_id: string; event: string; status: string; payload: Record<string, unknown> }> = [];
  while (Date.now() < deadline) {
    rows = await prisma.$queryRaw`SELECT id::text, asaas_event_id, event, status, payload FROM platform.asaas_event WHERE payload::text LIKE ${`%${payment.id}%`} ORDER BY received_at`;
    if (rows.some((r) => r.event === 'PAYMENT_RECEIVED' || r.event === 'PAYMENT_CONFIRMED')) break;
    await sleep(3000);
  }
  for (const r of rows) seenEvents.push({ event: r.event, status: r.status, keys: Object.keys(r.payload) });
  check('Asaas entregou webhooks no túnel', rows.length > 0, rows.map((r) => r.event));
  check('chegou PAYMENT_RECEIVED/CONFIRMED', rows.some((r) => r.event === 'PAYMENT_RECEIVED' || r.event === 'PAYMENT_CONFIRMED'), rows.map((r) => r.event));

  const pending = rows.filter((r) => r.status !== 'DONE');
  if (pending.length > 0) {
    console.log(`info ${pending.length} evento(s) ainda PENDING (worker parado?) — processando pelo mesmo código do worker`);
    for (const r of pending) await new ProcessAsaasEventAction().execute(r.id);
  } else {
    console.log('info eventos já processados pelo worker/varredor');
  }
  const subAfter = await http('/subscription', { headers: auth(A) });
  check('assinatura ATIVA e plano Clínica', data(subAfter).status === 'ACTIVE' && (data(subAfter).plan as { code?: string }).code === 'CLINICA', { status: data(subAfter).status });
  const pays = await http('/subscription/payments?limit=12', { headers: auth(A) });
  const payList = (pays.body?.data as Array<{ externalPaymentId: string; status: string }>) ?? [];
  check('fatura espelhada como paga', payList.some((p) => p.externalPaymentId === payment.id && ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(p.status)), payList);

  // ───────────── 3. Cancelamento ─────────────
  console.log('\n— 3. Cancelamento —');
  const cancel = await http('/subscription/cancel', { method: 'POST', headers: auth(A), body: JSON.stringify({ reason: 'homologação' }) });
  check('POST /cancel → CANCELLED', cancel.status === 200 && data(cancel).status === 'CANCELLED', cancel.body);
  const afterCancel = await asaas.request<Record<string, unknown>>('GET', `/subscriptions/${asaasSubId}`).catch(() => ({ deleted: true }));
  check('recorrência removida no Asaas', afterCancel.deleted === true, afterCancel);

  // ───────────── 4. Boleto ─────────────
  console.log('\n— 4. Boleto —');
  const B = await signup('boleto');
  const boleto = await http('/subscription/checkout', {
    method: 'POST',
    headers: auth(B, { 'idempotency-key': `homolog-${run}-boleto` }),
    body: JSON.stringify({ planCode: 'ESSENCIAL', billingMethod: 'BOLETO', cpfCnpj: CPF }),
  });
  const bp = (data(boleto).payment as { boleto?: { digitableLine: string | null; url: string | null } } | undefined)?.boleto;
  check('boleto → linha digitável e link', boleto.status === 201 && Boolean(bp?.digitableLine) && Boolean(bp?.url), boleto.body);

  // ───────────── 5. Cartão (Asaas Checkout) ─────────────
  console.log('\n— 5. Cartão: criação do checkout hospedado —');
  const C = await signup('cartao');
  const card = await http('/subscription/checkout', {
    method: 'POST',
    headers: auth(C, { 'idempotency-key': `homolog-${run}-card` }),
    body: JSON.stringify({ planCode: 'CLINICA', billingMethod: 'CREDIT_CARD', cpfCnpj: CPF }),
  });
  const redirectUrl = data(card).redirectUrl as string | undefined;
  check('Asaas aceitou o checkout RECURRENT com `customer`', card.status === 201 && Boolean(redirectUrl), card.body);
  if (redirectUrl) {
    const u = new URL(redirectUrl);
    console.log(`info URL do checkout: ${u.origin}${u.pathname} (id omitido)`);
    const page = await fetch(redirectUrl, { redirect: 'manual' }).catch(() => null);
    check('página do checkout responde', page !== null && page.status < 400, page?.status);
  }

  // ───────────── Resumo ─────────────
  const all = await prisma.$queryRaw<Array<{ event: string; status: string }>>`SELECT event, status FROM platform.asaas_event WHERE received_at > now() - interval '30 minutes' ORDER BY received_at`;
  console.log('\nEventos recebidos nos últimos 30 min:', all.map((e) => `${e.event}:${e.status}`).join(', ') || '(nenhum)');
  console.log(`Tenants de teste: pix=${A.tenantId} boleto=${B.tenantId} cartao=${C.tenantId}`);
  await prisma.$disconnect();
  console.log(failures === 0 ? '\nHOMOLOGAÇÃO OK' : `\nHOMOLOGAÇÃO COM FALHAS (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
