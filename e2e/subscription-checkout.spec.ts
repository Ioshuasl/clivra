import { expect, test } from './helpers/fixtures';
import {
  PIX_PAYLOAD,
  mockBilling,
  openPayment,
  paidPayment,
  pixCheckoutResponse,
  type BillingMockState,
} from './helpers/billing-mocks';

/**
 * S9 Blocos 5–6 — UI de cobrança. A API de assinatura é simulada no navegador (page.route):
 * o objetivo aqui é a experiência (checkout próprio, polling, faturas, cancelamento); o backend e o
 * Asaas já são cobertos pelos smokes `test:subscription-checkout` / `test:asaas-webhook`.
 */
test.describe('Assinatura — checkout e cobranças (owner)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
  });

  test('Pix: escolhe plano, gera QR Code na própria página e confirma sozinho', async ({ page }) => {
    const state: BillingMockState = {
      status: 'TRIAL',
      checkoutAvailable: true,
      hasRecurringBilling: false,
      billingMethod: null,
      planCode: 'ESSENCIAL',
      payments: [],
      checkoutResponse: pixCheckoutResponse(),
    };
    const log = await mockBilling(page, state);

    await page.goto('/app/assinatura/checkout');
    await expect(page.getByRole('heading', { name: 'Assinar o Clivra' })).toBeVisible();
    await expect(page.getByTestId('plan-option-ESSENCIAL')).toBeVisible();
    await expect(page.getByTestId('plan-option-CLINICA')).toContainText('Mais escolhido');
    await expect(page.getByTestId('plan-option-REDE')).toContainText('R$ 399');

    // Clínica vem pré-selecionada; Pix é a forma padrão.
    await expect(page.getByRole('radio', { name: 'Plano Clínica' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Pix' })).toBeChecked();
    await expect(page.getByTestId('checkout-submit')).toHaveText('Gerar Pix');

    await page.screenshot({ path: 'test-results/checkout-choose-1366.png' });

    // O CNPJ da clínica vem pré-preenchido; sem ele, CPF/CNPJ é obrigatório e validado antes de chamar a API.
    await page.getByLabel('CPF ou CNPJ do responsável pela cobrança').fill('');
    await page.getByTestId('checkout-submit').click();
    await expect(page.getByText('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).')).toBeVisible();
    expect(log.checkoutRequests).toHaveLength(0);

    await page.getByLabel('CPF ou CNPJ do responsável pela cobrança').fill('24971563792');
    await expect(page.getByLabel('CPF ou CNPJ do responsável pela cobrança')).toHaveValue('249.715.637-92');
    await page.getByTestId('checkout-submit').click();

    await expect(page.getByTestId('payment-pix-panel')).toBeVisible();
    await expect(page.getByTestId('payment-pix-qr')).toBeVisible();
    await expect(page.getByTestId('payment-pix-payload')).toHaveValue(PIX_PAYLOAD);
    await expect(page.getByTestId('checkout-waiting')).toBeVisible();
    await page.screenshot({ path: 'test-results/checkout-pix-1366.png' });

    expect(log.checkoutRequests).toHaveLength(1);
    const request = log.checkoutRequests[0];
    expect(request.headers['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(request.body).toEqual({ planCode: 'CLINICA', billingMethod: 'PIX', cpfCnpj: '24971563792' });

    // O "webhook" confirma o pagamento: a tela troca sozinha (polling), sem recarregar.
    state.status = 'ACTIVE';
    state.planCode = 'CLINICA';
    await expect(page.getByTestId('checkout-success')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Pagamento confirmado')).toBeVisible();
  });

  test('cartão: redireciona ao ambiente seguro e o retorno só confirma após o webhook', async ({ page }) => {
    const state: BillingMockState = {
      status: 'TRIAL',
      checkoutAvailable: true,
      hasRecurringBilling: false,
      billingMethod: null,
      planCode: 'ESSENCIAL',
      payments: [],
      // Mesma origem para o teste conseguir seguir o redirecionamento.
      checkoutResponse: {
        checkoutId: 'chk-card',
        billingMethod: 'CREDIT_CARD',
        status: 'PENDING',
        redirectUrl: '/app/assinatura/retorno?status=success',
      },
    };
    const log = await mockBilling(page, state);

    await page.goto('/app/assinatura/checkout');
    await page.getByRole('radio', { name: 'Cartão de crédito' }).click();
    await expect(page.getByTestId('checkout-submit')).toHaveText('Continuar para o pagamento seguro');
    // No cartão não há CPF/CNPJ na nossa tela: o titular informa tudo na página segura do Asaas.
    await expect(page.getByTestId('checkout-card-note')).toBeVisible();
    await expect(page.getByLabel('CPF ou CNPJ do responsável pela cobrança')).toHaveCount(0);
    await page.getByTestId('checkout-submit').click();

    await page.waitForURL('**/app/assinatura/retorno?status=success');
    await expect(page.getByTestId('return-confirming')).toBeVisible();
    // Voltar do Asaas NÃO ativa nada: segue "confirmando" até o webhook.
    await page.waitForTimeout(3500);
    await expect(page.getByTestId('return-confirming')).toBeVisible();

    state.status = 'ACTIVE';
    await expect(page.getByTestId('checkout-success')).toBeVisible({ timeout: 15_000 });
    expect(log.checkoutRequests[0].body).toEqual({ planCode: 'CLINICA', billingMethod: 'CREDIT_CARD' });
  });

  test('erros do servidor aparecem sem perder a escolha; retorno cancelado/expirado oferece nova tentativa', async ({
    page,
  }) => {
    const state: BillingMockState = {
      status: 'TRIAL',
      checkoutAvailable: true,
      hasRecurringBilling: false,
      billingMethod: null,
      planCode: 'ESSENCIAL',
      payments: [],
      checkoutError: {
        status: 422,
        code: 'PLAN_LIMIT_EXCEEDED',
        message: 'Seu plano permite 1 profissional (uso atual: 3).',
      },
    };
    await mockBilling(page, state);

    await page.goto('/app/assinatura/checkout');
    await page.getByRole('radio', { name: 'Plano Essencial' }).click();
    await page.getByLabel('CPF ou CNPJ do responsável pela cobrança').fill('24971563792');
    await page.getByTestId('checkout-submit').click();
    await expect(page.getByTestId('checkout-error')).toContainText('Seu plano permite 1 profissional');
    await expect(page.getByRole('radio', { name: 'Plano Essencial' })).toBeChecked();

    await page.goto('/app/assinatura/retorno?status=cancel');
    await expect(page.getByTestId('return-cancelled')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tentar de novo' })).toBeVisible();
    await page.goto('/app/assinatura/retorno?status=expired');
    await expect(page.getByTestId('return-expired')).toBeVisible();
  });

  test('pagamento online desligado: avisa e não deixa gerar cobrança', async ({ page }) => {
    await mockBilling(page, {
      status: 'TRIAL',
      checkoutAvailable: false,
      hasRecurringBilling: false,
      billingMethod: null,
      planCode: 'ESSENCIAL',
      payments: [],
    });
    await page.goto('/app/assinatura/checkout');
    await expect(page.getByTestId('checkout-unavailable')).toBeVisible();
    await expect(page.getByTestId('checkout-submit')).toBeDisabled();
  });

  test('assinatura em dia: mostra plano, faturas e permite cancelar com confirmação', async ({ page }) => {
    const state: BillingMockState = {
      status: 'ACTIVE',
      checkoutAvailable: true,
      hasRecurringBilling: true,
      billingMethod: 'PIX',
      planCode: 'CLINICA',
      payments: [openPayment('PENDING', 24), paidPayment(-6)],
    };
    const log = await mockBilling(page, state);

    await page.goto('/app/assinatura');
    await page.waitForURL('**/configuracoes/assinatura');
    await expect(page.getByTestId('subscription-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Clivra Clínica' })).toBeVisible();
    await expect(page.getByText('Ativa', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Uso atual' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Faturas' })).toBeVisible();
    await expect(page.getByTestId('payments-table')).toBeVisible();
    await expect(page.getByTestId('payment-row-RECEIVED')).toContainText('Paga');
    await expect(page.getByTestId('payment-row-PENDING')).toContainText('Aguardando pagamento');
    await page.screenshot({ path: 'test-results/subscription-active-1366.png' });

    await page.getByTestId('subscription-cancel-open').click();
    await expect(page.getByTestId('cancel-dialog')).toBeVisible();
    await page.getByLabel('Quer nos contar o motivo? (opcional)').fill('Fechei a clínica');
    await page.getByTestId('cancel-confirm').click();
    await expect(page.getByTestId('cancel-dialog')).toHaveCount(0);
    expect(log.cancelRequests).toEqual([{ reason: 'Fechei a clínica' }]);
    await expect(page.getByTestId('subscription-readonly-alert')).toBeVisible({ timeout: 15_000 });
  });

  test('em atraso: alerta, CTA único para pagar a fatura em aberto e confirmação automática', async ({
    page,
  }) => {
    const state: BillingMockState = {
      status: 'PAST_DUE',
      checkoutAvailable: true,
      hasRecurringBilling: true,
      billingMethod: 'PIX',
      planCode: 'CLINICA',
      payments: [openPayment('OVERDUE', -3), paidPayment(-33)],
    };
    await mockBilling(page, state);

    // Fora de Assinatura o banner global avisa; dentro, a própria tela traz o alerta e o CTA.
    await page.goto('/app');
    await expect(page.getByTestId('subscription-banner-trial')).toContainText('Pagamento em atraso');
    await page.goto('/app/configuracoes/assinatura');
    await expect(page.getByTestId('subscription-pastdue-alert')).toBeVisible();
    await expect(page.getByTestId('subscription-banner-trial')).toHaveCount(0);
    await expect(page.getByTestId('payment-row-OVERDUE')).toContainText('Vencida');
    await page.screenshot({ path: 'test-results/subscription-pastdue-1366.png' });

    await page.getByRole('button', { name: 'Pagar fatura em aberto' }).click();
    const dialog = page.getByTestId('payment-pay-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('payment-pix-payload')).toHaveValue(PIX_PAYLOAD);

    state.status = 'ACTIVE';
    state.payments = [{ ...openPayment('OVERDUE', -3), status: 'RECEIVED' }, paidPayment(-33)];
    await expect(dialog).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByTestId('subscription-pastdue-alert')).toHaveCount(0);
  });

  test('cartão cadastrado no teste: avisa a data da 1ª cobrança e permite cancelar só a cobrança agendada', async ({
    page,
  }) => {
    const state: BillingMockState = {
      status: 'TRIAL',
      checkoutAvailable: true,
      hasRecurringBilling: true,
      billingMethod: 'CREDIT_CARD',
      planCode: 'ESSENCIAL',
      payments: [{ ...openPayment('PENDING', 10), billingType: 'CREDIT_CARD' }],
    };
    const log = await mockBilling(page, state);

    // Volta do Asaas: o cartão está cadastrado, mas só será cobrado no fim do teste.
    await page.goto('/app/assinatura/retorno?status=success');
    await expect(page.getByTestId('checkout-success')).toContainText('Cartão cadastrado');
    await expect(page.getByTestId('checkout-success')).toContainText('primeira cobrança será em');

    await page.goto('/app/configuracoes/assinatura');
    await expect(page.getByTestId('subscription-trial-alert')).toContainText('Assinatura confirmada');
    await expect(page.getByRole('link', { name: 'Assinar agora' })).toHaveCount(0);
    await expect(page.getByText('Primeira cobrança', { exact: true })).toBeVisible();
    // Cartão é automático: não há botão "Pagar" na fatura.
    await expect(page.getByRole('button', { name: 'Pagar', exact: true })).toHaveCount(0);

    await page.getByTestId('subscription-cancel-open').click();
    await expect(page.getByRole('heading', { name: 'Cancelar a cobrança agendada?' })).toBeVisible();
    state.hasRecurringBilling = false;
    state.billingMethod = null;
    await page.getByTestId('cancel-confirm').click();
    await expect(page.getByTestId('cancel-dialog')).toHaveCount(0);
    expect(log.cancelRequests).toHaveLength(1);
    // A clínica continua no teste (não vira somente leitura).
    await expect(page.getByTestId('subscription-readonly-alert')).toHaveCount(0);
  });

  test('suspensa: banner global leva a reativar e a tela de assinatura oferece o CTA', async ({ page }) => {
    await mockBilling(page, {
      status: 'SUSPENDED',
      checkoutAvailable: true,
      hasRecurringBilling: true,
      billingMethod: 'PIX',
      planCode: 'CLINICA',
      payments: [openPayment('OVERDUE', -9)],
    });
    await page.goto('/app');
    await expect(page.getByTestId('subscription-banner-readonly')).toContainText('somente leitura');
    await expect(page.getByRole('link', { name: 'Reativar assinatura' })).toHaveAttribute(
      'href',
      '/app/assinatura/checkout',
    );
    await page.goto('/app/configuracoes/assinatura');
    await expect(page.getByTestId('subscription-readonly-alert')).toBeVisible();
    const cta = page.getByRole('link', { name: 'Reativar assinatura' }).first();
    await expect(cta).toHaveAttribute('href', '/app/assinatura/checkout');
  });
});
