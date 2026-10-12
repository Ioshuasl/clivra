import { bootAsaasSmoke } from './lib/asaas_smoke_harness.js';

/**
 * S9 Bloco 1 — adapter Asaas contra o servidor fake: cliente idempotente, assinatura, cobranças,
 * Pix/boleto, checkout de cartão, erros do gateway e kill switch (adapter manual).
 */
async function main() {
  const h = await bootAsaasSmoke('asaas-adapter');
  const { AsaasBillingAdapter } = await import('../src/modules/subscription/adapters/asaas_billing.adapter.js');
  const { ManualBillingAdapter } = await import('../src/modules/subscription/adapters/manual_billing.adapter.js');
  const { AsaasClient } = await import('../src/shared/integrations/asaas/asaas.client.js');
  const { asaasConfig } = await import('../src/shared/config/env.js');

  const adapter = new AsaasBillingAdapter();
  const tenantId = '0198aaaa-0000-7000-8000-000000000001';
  const customerInput = {
    tenantId,
    name: 'Clinica Teste',
    email: 'owner@example.com',
    cpfCnpj: '24971563792',
    mobilePhone: null,
  };

  // cliente: cria uma vez e reaproveita (externalReference)
  const first = await adapter.ensureCustomer(customerInput);
  const second = await adapter.ensureCustomer(customerInput);
  h.check('customer criado', first.created && first.customerId.startsWith('cus_'));
  h.check('customer reaproveitado, sem duplicar', !second.created && second.customerId === first.customerId && h.fake.customers.size === 1);

  const noCpf = await adapter
    .ensureCustomer({ ...customerInput, tenantId: '0198aaaa-0000-7000-8000-000000000002', cpfCnpj: null })
    .catch((err: { code?: string }) => err);
  h.check('sem CPF/CNPJ → CPF_CNPJ_REQUIRED', (noCpf as { code?: string }).code === 'CPF_CNPJ_REQUIRED');

  // assinatura + cobrança + valor em centavos
  const sub = await adapter.createSubscription({
    customerId: first.customerId,
    billingMethod: 'PIX',
    valueCents: 9900,
    nextDueDate: '2099-01-15',
    description: 'Plano Essencial',
    externalReference: tenantId,
  });
  const fakeSub = h.fake.subscriptions.get(sub.subscriptionId);
  h.check('assinatura enviada em reais, mensal, com externalReference', fakeSub?.value === 99 && fakeSub.cycle === 'MONTHLY' && fakeSub.externalReference === tenantId, fakeSub);

  const found = await adapter.findSubscriptionByReference(first.customerId, tenantId);
  h.check('findSubscriptionByReference encontra a assinatura', found?.id === sub.subscriptionId && found.billingType === 'PIX');

  const payments = await adapter.listSubscriptionPayments(sub.subscriptionId);
  h.check('lista cobranças normalizadas (centavos)', payments.length === 1 && payments[0].valueCents === 9900 && payments[0].status === 'PENDING', payments);

  const pix = await adapter.getPixQrCode(payments[0].id);
  h.check('Pix: QR Code e copia-e-cola', pix.encodedImage.length > 0 && pix.payload.startsWith('00020126'));
  const boleto = await adapter.getBoleto(payments[0].id);
  h.check('boleto: linha digitável e link', Boolean(boleto.identificationField) && Boolean(boleto.bankSlipUrl));

  // checkout de cartão: usa o link do Asaas e manda callbacks/recorrência
  const checkout = await adapter.createCardCheckout({
    valueCents: 19900,
    itemName: 'Plano Clínica',
    description: 'Assinatura mensal',
    nextDueDate: '2099-01-15',
    externalReference: tenantId,
    minutesToExpire: 60,
    callback: { successUrl: 'https://app/ok', cancelUrl: 'https://app/no', expiredUrl: 'https://app/exp' },
  });
  const sentCheckout = h.fake.checkouts.get(checkout.checkoutId) as Record<string, unknown>;
  const sentSub = sentCheckout.subscription as { cycle: string; nextDueDate: string };
  h.check(
    'checkout RECURRENT só cartão',
    JSON.stringify(sentCheckout.chargeTypes) === '["RECURRENT"]' &&
      JSON.stringify(sentCheckout.billingTypes) === '["CREDIT_CARD"]' &&
      sentSub.cycle === 'MONTHLY' &&
      sentSub.nextDueDate === '2099-01-15 12:00:00' &&
      sentCheckout.customer === undefined,
    sentCheckout,
  );
  h.check('checkout devolve o link do Asaas', checkout.url.includes('/checkoutSession/show?id='));

  // erros: chave inválida → 502 definitivo; 500 em GET → retry; timeout em POST → inconclusivo
  const badKey = new AsaasBillingAdapter(new AsaasClient({ ...asaasConfig(), apiKey: '$aact_hmlg_wrong' }));
  const bad = await badKey.getSubscription(sub.subscriptionId).catch((err: { code?: string; details?: { inconclusive?: boolean } }) => err);
  h.check('chave inválida → BILLING_GATEWAY_ERROR definitivo', (bad as { code?: string }).code === 'BILLING_GATEWAY_ERROR' && (bad as { details?: { inconclusive?: boolean } }).details?.inconclusive === false, bad);

  h.fake.injectFault(/^GET \/subscriptions\//, 'http500', 1);
  const afterRetry = await adapter.getSubscription(sub.subscriptionId);
  h.check('GET com 500 transitório é repetido', afterRetry.id === sub.subscriptionId);

  h.fake.injectFault(/^POST \/subscriptions$/, 'drop', 1);
  const timeout = await adapter
    .createSubscription({
      customerId: first.customerId,
      billingMethod: 'BOLETO',
      valueCents: 9900,
      nextDueDate: '2099-02-15',
      description: 'x',
      externalReference: 'ref-timeout',
    })
    .catch((err: { code?: string; details?: { inconclusive?: boolean } }) => err);
  h.check(
    'POST sem resposta é inconclusivo e NÃO é repetido às cegas',
    (timeout as { details?: { inconclusive?: boolean } }).details?.inconclusive === true &&
      h.fake.subscriptionsOf('ref-timeout').length === 1,
    timeout,
  );

  // cancelamento tolera 404
  await adapter.cancelSubscription(sub.subscriptionId);
  await adapter.cancelSubscription('sub_inexistente');
  h.check('cancelar remove a recorrência e tolera 404', h.fake.subscriptions.get(sub.subscriptionId)?.deleted === true);

  // kill switch
  const manual = await new ManualBillingAdapter().createSubscription().catch((err: { code?: string }) => err);
  h.check('adapter manual → BILLING_UNAVAILABLE', (manual as { code?: string }).code === 'BILLING_UNAVAILABLE');

  await h.close();
  h.finish();
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
