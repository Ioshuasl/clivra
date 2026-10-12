import { bootAsaasSmoke } from './lib/asaas_smoke_harness.js';

/**
 * S9 Bloco 2 — POST /subscription/checkout (Pix, boleto, cartão), idempotência, retry após timeout
 * sem duplicar, cobranças, cancelamento e kill switch.
 */
async function main() {
  const h = await bootAsaasSmoke('subscription-checkout');
  const { getTenantPrisma, getPrismaClient } = await import('../src/shared/database/tenant_prisma.js');
  const { setBillingAdapter } = await import('../src/modules/subscription/adapters/billing_adapter.factory.js');
  const { ManualBillingAdapter } = await import('../src/modules/subscription/adapters/manual_billing.adapter.js');
  const db = getTenantPrisma();

  const owner = await h.signupOwner('main');
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    h.request(path, { method: 'POST', headers: h.authHeaders(owner, headers), body: JSON.stringify(body) });
  const get = (path: string) => h.request(path, { headers: h.authHeaders(owner) });
  const ctx = { tenantId: owner.tenantId, userId: owner.userId, requestId: 'smoke-checkout' };

  // validações de entrada
  const noKey = await post('/api/v1/subscription/checkout', { planCode: 'CLINICA', billingMethod: 'PIX' });
  h.check('sem Idempotency-Key → 400', noKey.status === 400, noKey.body);
  const badBody = await post('/api/v1/subscription/checkout', { planCode: 'NOPE', billingMethod: 'PIX' }, { 'idempotency-key': 'k0' });
  h.check('corpo inválido → 400', badBody.status === 400, badBody.body);

  // sem CPF/CNPJ do tenant e sem informar → 422, sem criar nada no Asaas
  const needCpf = await post('/api/v1/subscription/checkout', { planCode: 'CLINICA', billingMethod: 'PIX' }, { 'idempotency-key': 'k1' });
  h.check('sem CPF/CNPJ → 422 CPF_CNPJ_REQUIRED', needCpf.status === 422 && h.errorCode(needCpf) === 'CPF_CNPJ_REQUIRED', needCpf.body);
  h.check('nenhuma assinatura criada na falha de validação', h.fake.subscriptions.size === 0);

  // Pix: assinatura mensal no preço do plano + QR Code na própria resposta
  const pix = await post('/api/v1/subscription/checkout', { planCode: 'CLINICA', billingMethod: 'PIX', cpfCnpj: '249.715.637-92' }, { 'idempotency-key': 'k1' });
  const pixPayment = h.dataOf(pix).payment as { id: string; valueCents: number; pix?: { qrCodeBase64: string; payload: string } } | undefined;
  h.check('Pix → 201 com QR Code e copia-e-cola', pix.status === 201 && Boolean(pixPayment?.pix?.qrCodeBase64) && Boolean(pixPayment?.pix?.payload), pix.body);
  h.check('valor do plano Clínica (19900) enviado como R$ 199', pixPayment?.valueCents === 19900 && [...h.fake.subscriptions.values()][0]?.value === 199);
  h.check('um customer e uma assinatura com externalReference = tenant', h.fake.customers.size === 1 && h.fake.subscriptionsOf(owner.tenantId).length === 1);
  h.check('CPF/CNPJ enviado só com dígitos', [...h.fake.customers.values()][0]?.cpfCnpj === '24971563792');

  const sub = await get('/api/v1/subscription');
  h.check('assinatura segue TRIAL até o pagamento', h.dataOf(sub).status === 'TRIAL', h.dataOf(sub).status);
  const row = await db.runInTenantContext(ctx, (tx) => tx.subscription.findUnique({ where: { tenantId: owner.tenantId } }));
  h.check('ids do Asaas e forma de cobrança gravados', Boolean(row?.externalCustomerId) && Boolean(row?.externalSubscriptionId) && row?.billingMethod === 'PIX' && row?.billingProvider === 'ASAAS', row);

  // replay com a mesma chave: mesma resposta, nada novo no Asaas
  const customersBefore = h.fake.count('POST', '/customers');
  const subsBefore = h.fake.count('POST', '/subscriptions');
  const replay = await post('/api/v1/subscription/checkout', { planCode: 'CLINICA', billingMethod: 'PIX', cpfCnpj: '24971563792' }, { 'idempotency-key': 'k1' });
  h.check('replay (mesma chave) → 201 e mesmo checkoutId', replay.status === 201 && h.dataOf(replay).checkoutId === h.dataOf(pix).checkoutId, replay.body);
  h.check('replay não cria customer nem assinatura', h.fake.count('POST', '/customers') === customersBefore && h.fake.count('POST', '/subscriptions') === subsBefore);
  const reused = await post('/api/v1/subscription/checkout', { planCode: 'REDE', billingMethod: 'PIX', cpfCnpj: '24971563792' }, { 'idempotency-key': 'k1' });
  h.check('mesma chave com outro plano → 409 IDEMPOTENCY_KEY_REUSED', reused.status === 409 && h.errorCode(reused) === 'IDEMPOTENCY_KEY_REUSED', reused.body);

  // cobranças do tenant e QR atualizado
  const list = await get('/api/v1/subscription/payments');
  const payments = (list.body?.data as Array<{ id: string; status: string; valueCents: number }>) ?? [];
  h.check('GET /payments lista a cobrança espelhada', list.status === 200 && payments.length === 1 && payments[0].status === 'PENDING', list.body);
  const pay = await get(`/api/v1/subscription/payments/${payments[0]?.id}/pay`);
  h.check('GET /payments/:id/pay devolve QR Pix', pay.status === 200 && Boolean((h.dataOf(pay).pix as { payload?: string } | undefined)?.payload), pay.body);
  const missing = await get('/api/v1/subscription/payments/0198aaaa-0000-7000-8000-00000000ffff/pay');
  h.check('cobrança inexistente → 404', missing.status === 404, missing.body);

  // trocar para boleto cancela a assinatura Pix e cria outra (sem duplicar recorrência)
  const boleto = await post('/api/v1/subscription/checkout', { planCode: 'CLINICA', billingMethod: 'BOLETO' }, { 'idempotency-key': 'k2' });
  const boletoPayment = h.dataOf(boleto).payment as { boleto?: { digitableLine: string | null; url: string | null } } | undefined;
  h.check('boleto → linha digitável e link', boleto.status === 201 && Boolean(boletoPayment?.boleto?.digitableLine) && Boolean(boletoPayment?.boleto?.url), boleto.body);
  const live = h.fake.subscriptionsOf(owner.tenantId).filter((s) => !s.deleted);
  h.check('ao trocar a forma, só uma recorrência ativa no Asaas', live.length === 1 && live[0].billingType === 'BOLETO', live);

  // cartão: redireciona ao Asaas Checkout; replay devolve a mesma URL sem novo POST
  const card = await post('/api/v1/subscription/checkout', { planCode: 'CLINICA', billingMethod: 'CREDIT_CARD' }, { 'idempotency-key': 'k3' });
  const redirectUrl = h.dataOf(card).redirectUrl as string | undefined;
  h.check('cartão → redirectUrl do Asaas Checkout (nenhum dado de cartão no app)', card.status === 201 && Boolean(redirectUrl?.includes('/checkoutSession/show')), card.body);
  const sentCheckout = [...h.fake.checkouts.values()][0] as { callback?: { successUrl?: string }; externalReference?: string } | undefined;
  h.check('callbacks voltam para o app e externalReference = tenant', Boolean(sentCheckout?.callback?.successUrl?.includes('/app/assinatura/retorno')) && sentCheckout?.externalReference === owner.tenantId, sentCheckout);
  const checkoutsBefore = h.fake.count('POST', '/checkouts');
  const cardReplay = await post('/api/v1/subscription/checkout', { planCode: 'CLINICA', billingMethod: 'CREDIT_CARD' }, { 'idempotency-key': 'k3' });
  const sentCard = [...h.fake.checkouts.values()][0] as Record<string, unknown>;
  h.check('checkout de cartão vai SEM customer (o Asaas coleta os dados do pagador)', !('customer' in sentCard), Object.keys(sentCard));
  const linkRows = await getPrismaClient().$queryRaw<Array<{ c: bigint }>>`SELECT count(*) AS c FROM platform.asaas_checkout_link WHERE tenant_id = ${owner.tenantId}::uuid`;
  h.check('id do checkout vinculado ao tenant (webhook acha o tenant por ele)', Number(linkRows[0].c) === 1, linkRows);
  h.check('replay do cartão → mesma URL, sem novo checkout', h.dataOf(cardReplay).redirectUrl === redirectUrl && h.fake.count('POST', '/checkouts') === checkoutsBefore, cardReplay.body);

  // timeout no POST /subscriptions: a retentativa adota a assinatura criada em vez de duplicar
  const owner2 = await h.signupOwner('timeout');
  const post2 = (body: unknown, key: string) =>
    h.request('/api/v1/subscription/checkout', { method: 'POST', headers: h.authHeaders(owner2, { 'idempotency-key': key }), body: JSON.stringify(body) });
  h.fake.injectFault(/^POST \/subscriptions$/, 'drop', 1);
  const dropped = await post2({ planCode: 'ESSENCIAL', billingMethod: 'PIX', cpfCnpj: '11144477735' }, 'kt');
  h.check('timeout no gateway → 502 inconclusivo', dropped.status === 502 && h.errorCode(dropped) === 'BILLING_GATEWAY_ERROR', dropped.body);
  const resumed = await post2({ planCode: 'ESSENCIAL', billingMethod: 'PIX', cpfCnpj: '11144477735' }, 'kt');
  h.check('retentativa com a mesma chave → 201', resumed.status === 201 && Boolean((h.dataOf(resumed).payment as { pix?: unknown } | undefined)?.pix), resumed.body);
  h.check('retentativa não duplicou a assinatura', h.fake.subscriptionsOf(owner2.tenantId).length === 1, h.fake.subscriptionsOf(owner2.tenantId));

  // cancelar durante o teste só desfaz a cobrança agendada: a clínica continua em TRIAL (não vira somente leitura)
  const cancelTrial = await h.request('/api/v1/subscription/cancel', { method: 'POST', headers: h.authHeaders(owner2), body: JSON.stringify({ reason: 'desisti antes do fim do teste' }) });
  const trialAfter = await h.request('/api/v1/subscription', { headers: h.authHeaders(owner2) });
  h.check('cancelar no TRIAL mantém o teste e remove a recorrência', cancelTrial.status === 200 && h.dataOf(trialAfter).status === 'TRIAL' && h.dataOf(trialAfter).hasRecurringBilling === false && h.fake.subscriptionsOf(owner2.tenantId).every((s) => s.deleted), { cancel: cancelTrial.body, sub: h.dataOf(trialAfter) });
  const writeAfterTrialCancel = await h.request('/api/v1/clinic/units', { headers: h.authHeaders(owner2) });
  h.check('clínica segue gravável após cancelar no teste', writeAfterTrialCancel.status === 200);

  // já ativa → 409
  await db.runInTenantContext(ctx, (tx) => tx.subscription.update({ where: { tenantId: owner.tenantId }, data: { status: 'ACTIVE' } }));
  const already = await post('/api/v1/subscription/checkout', { planCode: 'CLINICA', billingMethod: 'PIX' }, { 'idempotency-key': 'k9' });
  h.check('assinatura já ativa → 409', already.status === 409 && h.errorCode(already) === 'SUBSCRIPTION_ALREADY_ACTIVE', already.body);

  // cancelamento: remove a recorrência no Asaas e leva a CANCELLED
  const cancel = await post('/api/v1/subscription/cancel', { reason: 'teste' });
  const stillLive = h.fake.subscriptionsOf(owner.tenantId).filter((s) => !s.deleted);
  const afterCancel = await get('/api/v1/subscription');
  h.check('cancelar → CANCELLED e recorrência removida', cancel.status === 200 && h.dataOf(afterCancel).status === 'CANCELLED' && stillLive.length === 0, { cancel: cancel.body, status: h.dataOf(afterCancel).status });

  // EXPIRED consegue pagar: checkout não passa pelo subscriptionGuard
  const owner3 = await h.signupOwner('expired');
  const ctx3 = { tenantId: owner3.tenantId, userId: owner3.userId, requestId: 'smoke-expired' };
  await db.runInTenantContext(ctx3, (tx) => tx.subscription.update({ where: { tenantId: owner3.tenantId }, data: { status: 'EXPIRED' } }));
  const expiredCheckout = await h.request('/api/v1/subscription/checkout', {
    method: 'POST',
    headers: h.authHeaders(owner3, { 'idempotency-key': 'ke' }),
    body: JSON.stringify({ planCode: 'ESSENCIAL', billingMethod: 'PIX', cpfCnpj: '11144477735' }),
  });
  h.check('EXPIRED consegue gerar o pagamento', expiredCheckout.status === 201, expiredCheckout.body);

  // kill switch: BILLING_PROVIDER=manual
  setBillingAdapter(new ManualBillingAdapter());
  const off = await post('/api/v1/subscription/checkout', { planCode: 'CLINICA', billingMethod: 'PIX' }, { 'idempotency-key': 'k10' });
  h.check('kill switch (manual) → 503 BILLING_UNAVAILABLE', off.status === 503 && h.errorCode(off) === 'BILLING_UNAVAILABLE', off.body);
  setBillingAdapter(undefined);

  // papel sem permissão
  const noAuth = await h.request('/api/v1/subscription/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  h.check('sem token → 401', noAuth.status === 401);

  await h.close();
  h.finish();
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
