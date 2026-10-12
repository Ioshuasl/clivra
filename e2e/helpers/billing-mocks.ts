import type { Page, Route } from '@playwright/test';

/** PNG 1×1 branco — suficiente para provar que o QR é renderizado. */
export const QR_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
export const PIX_PAYLOAD = '00020126580014br.gov.bcb.pix0136e2e-clivra-pix-copia-e-cola5204000053039865802BR';

type PlanLimits = {
  professionals: number | null;
  adminUsers: number | null;
  units: number | null;
  storageGb: number | null;
  messagesMonth: number | null;
};

const PLANS = [
  { id: 'p1', code: 'ESSENCIAL', name: 'Essencial', priceCents: 9900, limits: { professionals: 1, adminUsers: 2, units: 1, storageGb: 5, messagesMonth: null } },
  { id: 'p2', code: 'CLINICA', name: 'Clínica', priceCents: 19900, limits: { professionals: 5, adminUsers: 6, units: 1, storageGb: 25, messagesMonth: null } },
  { id: 'p3', code: 'REDE', name: 'Rede', priceCents: 39900, limits: { professionals: null, adminUsers: null, units: 5, storageGb: 100, messagesMonth: null } },
].map((plan) => ({ ...plan, interval: 'MONTHLY', active: true, limits: plan.limits as PlanLimits }));

export type MockPayment = {
  id: string;
  externalPaymentId: string;
  status: string;
  valueCents: number;
  dueDate: string;
  paidAt: string | null;
  billingType: string | null;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
};

export type BillingMockState = {
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED';
  checkoutAvailable: boolean;
  hasRecurringBilling: boolean;
  billingMethod: string | null;
  planCode: string;
  payments: MockPayment[];
  /** Resposta do POST /subscription/checkout. */
  checkoutResponse?: Record<string, unknown>;
  checkoutError?: { status: number; code: string; message: string };
};

export type BillingMockLog = {
  checkoutRequests: Array<{ headers: Record<string, string>; body: Record<string, unknown> }>;
  cancelRequests: Array<Record<string, unknown>>;
};

function iso(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString();
}

export function ymd(daysFromNow: number): string {
  return iso(daysFromNow).slice(0, 10);
}

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

/**
 * Simula a API de cobrança no navegador (o app fala só com `/subscription*`; o Asaas nunca é chamado).
 * O estado é mutável: o teste muda `state.status` para simular o webhook confirmando o pagamento.
 */
export async function mockBilling(page: Page, state: BillingMockState): Promise<BillingMockLog> {
  const log: BillingMockLog = { checkoutRequests: [], cancelRequests: [] };
  const plan = () => PLANS.find((p) => p.code === state.planCode) ?? PLANS[0];

  await page.route('**/api/v1/subscription', (route) =>
    json(route, 200, {
      data: {
        id: 'sub-e2e',
        tenantId: 'tenant-e2e',
        status: state.status,
        trialEndsAt: state.status === 'TRIAL' ? iso(10) : null,
        currentPeriodEnd: state.status === 'ACTIVE' || state.status === 'PAST_DUE' ? iso(24) : null,
        cancelAt: state.status === 'CANCELLED' ? iso(0) : null,
        billingMethod: state.billingMethod,
        billingProvider: state.checkoutAvailable ? 'ASAAS' : 'MANUAL',
        hasRecurringBilling: state.hasRecurringBilling,
        checkoutAvailable: state.checkoutAvailable,
        plan: plan(),
        createdAt: iso(-4),
        updatedAt: iso(-1),
      },
    }),
  );
  await page.route('**/api/v1/subscription/plans', (route) => json(route, 200, { data: PLANS }));
  await page.route('**/api/v1/subscription/usage', (route) =>
    json(route, 200, {
      data: {
        items: [
          { metric: 'professionals', current: 1, limit: 5, period: 'CURRENT' },
          { metric: 'admin_users', current: 2, limit: 6, period: 'CURRENT' },
          { metric: 'units', current: 1, limit: 1, period: 'CURRENT' },
          { metric: 'storage_bytes', current: 52_428_800, limit: 26_843_545_600, period: 'CURRENT' },
        ],
      },
    }),
  );
  await page.route('**/api/v1/subscription/payments?*', (route) =>
    json(route, 200, { data: state.payments, meta: { nextCursor: null } }),
  );
  await page.route('**/api/v1/subscription/payments/*/pay', (route) =>
    json(route, 200, {
      data: {
        paymentId: 'pay-open',
        billingType: 'PIX',
        invoiceUrl: 'https://fake.asaas.test/i/pay-open',
        pix: { qrCodeBase64: QR_PNG_BASE64, payload: PIX_PAYLOAD, expiresAt: null },
      },
    }),
  );
  await page.route('**/api/v1/subscription/checkout', async (route) => {
    const request = route.request();
    log.checkoutRequests.push({
      headers: request.headers(),
      body: JSON.parse(request.postData() ?? '{}') as Record<string, unknown>,
    });
    if (state.checkoutError) {
      const { status, code, message } = state.checkoutError;
      return json(route, status, { error: { code, message } });
    }
    return json(route, 201, { data: state.checkoutResponse ?? {} });
  });
  await page.route('**/api/v1/subscription/cancel', async (route) => {
    log.cancelRequests.push(JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>);
    // Como o backend: no teste só some a cobrança agendada; a conta continua em TRIAL.
    if (state.status !== 'TRIAL') state.status = 'CANCELLED';
    state.hasRecurringBilling = false;
    return json(route, 200, { data: { status: state.status } });
  });

  return log;
}

export function pixCheckoutResponse(valueCents = 19900) {
  return {
    checkoutId: 'chk-e2e',
    billingMethod: 'PIX',
    status: 'PENDING',
    payment: {
      id: 'pay-open',
      dueDate: ymd(10),
      valueCents,
      status: 'PENDING',
      invoiceUrl: 'https://fake.asaas.test/i/pay-open',
      pix: { qrCodeBase64: QR_PNG_BASE64, payload: PIX_PAYLOAD, expiresAt: null },
    },
  };
}

export function openPayment(status: 'PENDING' | 'OVERDUE', dueInDays: number): MockPayment {
  return {
    id: 'pay-open',
    externalPaymentId: 'pay_000001',
    status,
    valueCents: 19900,
    dueDate: ymd(dueInDays),
    paidAt: null,
    billingType: 'PIX',
    invoiceUrl: 'https://fake.asaas.test/i/pay-open',
    bankSlipUrl: null,
  };
}

export function paidPayment(dueInDays: number): MockPayment {
  return {
    id: 'pay-paid',
    externalPaymentId: 'pay_000000',
    status: 'RECEIVED',
    valueCents: 19900,
    dueDate: ymd(dueInDays),
    paidAt: iso(dueInDays),
    billingType: 'PIX',
    invoiceUrl: 'https://fake.asaas.test/i/pay-paid',
    bankSlipUrl: null,
  };
}
