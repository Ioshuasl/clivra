import { randomUUID } from 'node:crypto';
import { bootAsaasSmoke, WEBHOOK_TOKEN } from './lib/asaas_smoke_harness.js';
import type { FakePayment } from './lib/asaas_fake_server.js';

/**
 * S9 Blocos 3–4 — webhook do Asaas: token, idempotência, fora de ordem, derivação de estado,
 * PAST_DUE → SUSPENDED, cancelamento, evento desconhecido, varredor e reconciliação.
 */
async function main() {
  const h = await bootAsaasSmoke('asaas-webhook');
  const { getTenantPrisma, getPrismaClient } = await import('../src/shared/database/tenant_prisma.js');
  const { AsaasEventRepository } = await import('../src/modules/subscription/repositories/asaas_event/asaas_event.repository.js');
  const { ProcessAsaasEventAction } = await import('../src/modules/subscription/actions/subscription/asaas_event_process.action.js');
  const { SuspendPastDueAction } = await import('../src/modules/subscription/actions/subscription/subscription_suspend_past_due.action.js');
  const { ReconcileAction } = await import('../src/modules/subscription/actions/subscription/subscription_reconcile.action.js');
  const { sweepStuckAsaasEvents } = await import('../src/modules/subscription/jobs/process_asaas_event.job.js');
  const { civilDateIn } = await import('../src/modules/subscription/helpers/billing_date.helper.js');
  const db = getTenantPrisma();
  const events = new AsaasEventRepository();
  const run = randomUUID().slice(0, 8);
  let n = 0;

  const shiftDays = (ymd: string, days: number): string => {
    const d = new Date(`${ymd}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const today = civilDateIn('America/Sao_Paulo');

  const paymentBody = (p: FakePayment, status: string, patch: Record<string, unknown> = {}) => ({
    object: 'payment',
    id: p.id,
    customer: p.customer,
    subscription: p.subscription,
    status,
    value: p.value,
    dueDate: p.dueDate,
    billingType: p.billingType,
    invoiceUrl: p.invoiceUrl,
    bankSlipUrl: p.bankSlipUrl,
    deleted: false,
    externalReference: p.externalReference,
    ...patch,
  });

  const eventId = () => `evt_${run}${String((n += 1)).padStart(3, '0')}&9193`;

  async function deliver(body: Record<string, unknown>, opts: { process?: boolean; token?: string | null } = {}) {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (opts.token !== null) headers['asaas-access-token'] = opts.token ?? WEBHOOK_TOKEN;
    const res = await h.request('/api/v1/webhooks/asaas', { method: 'POST', headers, body: JSON.stringify(body) });
    if (res.status === 200 && opts.process !== false) {
      const row = await events.getByAsaasEventId(String(body.id));
      if (row && row.status !== 'DONE') await new ProcessAsaasEventAction().execute(row.id);
    }
    return res;
  }

  const send = (event: string, extra: Record<string, unknown>, opts?: Parameters<typeof deliver>[1]) =>
    deliver({ id: eventId(), event, dateCreated: '2026-10-12 10:00:00', ...extra }, opts);

  async function state(owner: { tenantId: string; userId: string }) {
    const ctx = { tenantId: owner.tenantId, userId: owner.userId, requestId: 'smoke-webhook' };
    return db.runInTenantContext(ctx, async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { tenantId: owner.tenantId } });
      const tenant = await tx.tenant.findUnique({ where: { id: owner.tenantId }, select: { status: true } });
      const payments = await tx.subscriptionPayment.findMany({ where: { tenantId: owner.tenantId } });
      const audits = await tx.auditLog.groupBy({ by: ['action'], where: { tenantId: owner.tenantId }, _count: true });
      const outbox = await tx.outboxEvent.groupBy({ by: ['name'], where: { tenantId: owner.tenantId }, _count: true });
      return {
        status: sub?.status,
        tenantStatus: tenant?.status,
        periodEnd: sub?.currentPeriodEnd,
        payments,
        audit: Object.fromEntries(audits.map((a) => [a.action, a._count])),
        outbox: Object.fromEntries(outbox.map((o) => [o.name, o._count])),
      };
    });
  }

  async function startTenant(label: string) {
    const owner = await h.signupOwner(label);
    const res = await h.request('/api/v1/subscription/checkout', {
      method: 'POST',
      headers: h.authHeaders(owner, { 'idempotency-key': `chk-${label}` }),
      body: JSON.stringify({ planCode: 'CLINICA', billingMethod: 'PIX', cpfCnpj: '24971563792' }),
    });
    if (res.status !== 201) throw new Error(`checkout ${label}: ${res.status} ${JSON.stringify(res.body)}`);
    const sub = h.fake.subscriptionsOf(owner.tenantId)[0];
    const payment = h.fake.paymentsOf(sub.id)[0];
    return { owner, sub, payment, ctx: { tenantId: owner.tenantId, userId: owner.userId, requestId: `smoke-${label}` } };
  }

  // ───────────────────────── entrada: token e validação ─────────────────────────
  const A = await startTenant('a');
  const rowsBefore = h.fake.requests.length;
  const noToken = await send('PAYMENT_CREATED', { payment: paymentBody(A.payment, 'PENDING') }, { token: null, process: false });
  const badToken = await send('PAYMENT_CREATED', { payment: paymentBody(A.payment, 'PENDING') }, { token: 'x'.repeat(40), process: false });
  h.check('sem token → 401', noToken.status === 401 && h.errorCode(noToken) === 'INVALID_WEBHOOK_TOKEN', noToken.body);
  h.check('token errado → 401', badToken.status === 401);
  const garbage = await deliver({ foo: 'bar' }, { process: false });
  h.check('corpo inválido com token válido → 400', garbage.status === 400, garbage.body);
  h.check('o app não chamou o Asaas para validar o webhook', h.fake.requests.length === rowsBefore);

  // ───────────────────────── ativação e idempotência ─────────────────────────
  await send('PAYMENT_CREATED', { payment: paymentBody(A.payment, 'PENDING') });
  let s = await state(A.owner);
  h.check('PAYMENT_CREATED não altera o status (TRIAL)', s.status === 'TRIAL', s.status);

  const receivedId = eventId();
  const receivedBody = {
    id: receivedId,
    event: 'PAYMENT_RECEIVED',
    dateCreated: '2026-10-12 10:05:00',
    payment: paymentBody(A.payment, 'RECEIVED', { paymentDate: today, netValue: 190.1 }),
  };
  const first = await deliver(receivedBody);
  s = await state(A.owner);
  h.check('PAYMENT_RECEIVED → ACTIVE', first.status === 200 && s.status === 'ACTIVE' && s.tenantStatus === 'ACTIVE', s);
  h.check('plano do checkout aplicado na ativação (Clínica)', (await (async () => {
    const sub = await db.runInTenantContext(A.ctx, (tx) => tx.subscription.findUnique({ where: { tenantId: A.owner.tenantId }, include: { plan: true } }));
    return sub?.plan.code;
  })()) === 'CLINICA');
  h.check('currentPeriodEnd definido', s.periodEnd !== null && s.periodEnd !== undefined);
  h.check('auditoria e evento de ativação gravados uma vez', s.audit.SUBSCRIPTION_PAYMENT_CONFIRMED === 1 && s.outbox['subscription.subscription_activated'] === 1, { audit: s.audit, outbox: s.outbox });

  const dup = await deliver(receivedBody);
  s = await state(A.owner);
  const rows = await getPrismaClient().$queryRaw<Array<{ c: bigint }>>`SELECT count(*) AS c FROM platform.asaas_event WHERE asaas_event_id = ${receivedId}`;
  h.check('entrega duplicada → 200 nas duas', dup.status === 200);
  h.check('duplicado gera 1 evento e 1 efeito', Number(rows[0].c) === 1 && s.audit.SUBSCRIPTION_PAYMENT_CONFIRMED === 1 && s.outbox['subscription.subscription_activated'] === 1, s.audit);

  // ───────────────────────── fora de ordem / evento atrasado ─────────────────────────
  await send('PAYMENT_OVERDUE', { payment: paymentBody(A.payment, 'OVERDUE') });
  await send('PAYMENT_CREATED', { payment: paymentBody(A.payment, 'PENDING') });
  s = await state(A.owner);
  const mirrored = s.payments.find((p) => p.externalPaymentId === A.payment.id);
  h.check('OVERDUE/CREATED atrasados após RECEIVED não rebaixam', s.status === 'ACTIVE' && mirrored?.status === 'RECEIVED', { status: s.status, payment: mirrored?.status });

  // ───────────────────────── inadimplência → suspensão → pagamento ─────────────────────────
  const payB = h.fake.addPayment(A.sub.id, { dueDate: shiftDays(today, -3), status: 'OVERDUE' });
  await send('PAYMENT_CREATED', { payment: paymentBody(payB, 'PENDING') });
  await send('PAYMENT_OVERDUE', { payment: paymentBody(payB, 'OVERDUE') });
  s = await state(A.owner);
  h.check('cobrança vencida → PAST_DUE', s.status === 'PAST_DUE' && s.outbox['subscription.payment_failed'] === 1, s);

  const early = await new SuspendPastDueAction().execute(A.ctx);
  h.check('3 dias de atraso ainda não suspende', !early.suspended && (await state(A.owner)).status === 'PAST_DUE');

  await send('PAYMENT_UPDATED', { payment: paymentBody(payB, 'OVERDUE', { dueDate: shiftDays(today, -8) }) });
  const late = await new SuspendPastDueAction().execute(A.ctx);
  s = await state(A.owner);
  h.check('8 dias de atraso → SUSPENDED', late.suspended && s.status === 'SUSPENDED' && s.tenantStatus === 'SUSPENDED' && s.outbox['subscription.subscription_suspended'] === 1, s);
  const writeWhileSuspended = await h.request('/api/v1/patients', { method: 'POST', headers: h.authHeaders(A.owner), body: JSON.stringify({ name: 'X' }) });
  h.check('suspensa: escrita bloqueada (402), leitura segue', writeWhileSuspended.status === 402, writeWhileSuspended.body);
  const readWhileSuspended = await h.request('/api/v1/subscription', { headers: h.authHeaders(A.owner) });
  h.check('suspensa: GET /subscription 200', readWhileSuspended.status === 200);

  await send('PAYMENT_CONFIRMED', { payment: paymentBody(payB, 'CONFIRMED', { dueDate: shiftDays(today, -8) }) });
  s = await state(A.owner);
  h.check('pagamento reativa SUSPENDED → ACTIVE', s.status === 'ACTIVE' && s.tenantStatus === 'ACTIVE', s);

  // cobrança que não pertence a esta assinatura é ignorada
  const before = (await state(A.owner)).payments.length;
  await send('PAYMENT_RECEIVED', { payment: paymentBody({ ...payB, id: 'pay_avulsa', subscription: 'sub_outra' } as FakePayment, 'RECEIVED') });
  h.check('cobrança de outra assinatura/avulsa é ignorada', (await state(A.owner)).payments.length === before);

  // ───────────────────────── cancelamento é final ─────────────────────────
  await send('SUBSCRIPTION_DELETED', { subscription: { object: 'subscription', id: A.sub.id, customer: A.sub.customer, status: 'INACTIVE', deleted: true } });
  s = await state(A.owner);
  h.check('SUBSCRIPTION_DELETED → CANCELLED', s.status === 'CANCELLED' && s.outbox['subscription.subscription_cancelled'] === 1, s);
  await send('PAYMENT_RECEIVED', { payment: paymentBody(payB, 'RECEIVED', { dueDate: shiftDays(today, -8) }) });
  h.check('evento posterior não ressuscita CANCELLED', (await state(A.owner)).status === 'CANCELLED');

  // ───────────────────────── eventos desconhecidos e tenant inexistente ─────────────────────────
  const unknown = await send('SOMETHING_NEW', { newField: { a: 1 }, payment: { object: 'payment', id: 'pay_x', customer: 'cus_inexistente' } });
  h.check('evento desconhecido/tenant não resolvido → 200 sem erro', unknown.status === 200);
  const unknownRow = await events.getByAsaasEventId((await getPrismaClient().$queryRaw<Array<{ asaas_event_id: string }>>`SELECT asaas_event_id FROM platform.asaas_event WHERE event = 'SOMETHING_NEW' AND asaas_event_id LIKE ${`evt_${run}%`} ORDER BY received_at DESC LIMIT 1`)[0].asaas_event_id);
  h.check('evento sem tenant espera um vínculo (PENDING) em vez de ser descartado', unknownRow?.status === 'PENDING', unknownRow?.status);
  await getPrismaClient().$executeRaw`UPDATE platform.asaas_event SET received_at = NOW() - interval '25 hours' WHERE id = ${unknownRow!.id}::uuid`;
  await new ProcessAsaasEventAction().execute(unknownRow!.id);
  h.check('passada a janela de 24 h, o evento órfão é descartado (DONE)', (await events.get(unknownRow!.id))?.status === 'DONE');

  // ───────────────────────── fora de ordem (pagamento antes do CREATED) ─────────────────────────
  const B = await startTenant('b');
  const payB2 = h.fake.addPayment(B.sub.id, { dueDate: shiftDays(today, -1), status: 'RECEIVED' });
  await send('PAYMENT_RECEIVED', { payment: paymentBody(payB2, 'RECEIVED') });
  await send('PAYMENT_CREATED', { payment: paymentBody(payB2, 'PENDING') });
  const sb = await state(B.owner);
  h.check('RECEIVED antes do CREATED converge para ACTIVE', sb.status === 'ACTIVE' && sb.payments.find((p) => p.externalPaymentId === payB2.id)?.status === 'RECEIVED', sb.status);

  // ───────────────────────── cancelar no teste não derruba a conta ─────────────────────────
  const E = await startTenant('e');
  const cancelE = await h.request('/api/v1/subscription/cancel', { method: 'POST', headers: h.authHeaders(E.owner), body: '{}' });
  await send('SUBSCRIPTION_DELETED', { subscription: { object: 'subscription', id: E.sub.id, customer: E.sub.customer, status: 'INACTIVE', deleted: true } });
  const se = await state(E.owner);
  h.check('SUBSCRIPTION_DELETED de recorrência antiga/cancelada no teste é ignorado (continua TRIAL)', cancelE.status === 200 && se.status === 'TRIAL' && se.tenantStatus === 'TRIAL', se.status);

  // ───────────────────────── varredor: evento persistido mas nunca processado ─────────────────────────
  const D = await startTenant('d');
  const sweptId = eventId();
  await deliver({ id: sweptId, event: 'PAYMENT_RECEIVED', payment: paymentBody(D.payment, 'RECEIVED') }, { process: false });
  h.check('webhook responde 200 mesmo sem fila (Redis fora)', (await events.getByAsaasEventId(sweptId))?.status === 'PENDING');
  await getPrismaClient().$executeRaw`UPDATE platform.asaas_event SET received_at = NOW() - interval '10 minutes' WHERE asaas_event_id = ${sweptId}`;
  const swept = await sweepStuckAsaasEvents();
  h.check('varredor reprocessa o evento preso e ativa a assinatura', swept >= 1 && (await state(D.owner)).status === 'ACTIVE', swept);

  // ───────────────────────── reconciliação (webhook perdido) ─────────────────────────
  const C = await startTenant('c');
  h.fake.setPayment(C.payment.id, { status: 'RECEIVED' });
  const reconciled = await new ReconcileAction().execute(C.ctx);
  s = await state(C.owner);
  h.check('reconciliação recupera pagamento sem webhook → ACTIVE', reconciled.checked && reconciled.divergences >= 1 && s.status === 'ACTIVE' && s.audit.SUBSCRIPTION_RECONCILED === 1, { reconciled, audit: s.audit });
  const again = await new ReconcileAction().execute(C.ctx);
  h.check('reconciliar de novo não encontra divergência', again.checked && again.divergences === 0, again);
  h.fake.subscriptions.get(C.sub.id)!.deleted = true;
  await new ReconcileAction().execute(C.ctx);
  h.check('assinatura removida no Asaas → CANCELLED', (await state(C.owner)).status === 'CANCELLED');

  await h.close();
  h.finish();
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
