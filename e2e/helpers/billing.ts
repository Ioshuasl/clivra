import { RECEPTION, SEED_PATIENT } from './credentials';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3333';

type Envelope<T> = { data?: T; meta?: { nextCursor?: string | null } };

type ApiSession = { token: string; tenantId: string };

let cachedReceptionSession: ApiSession | null = null;

async function loginWithBackoff(
  email: string,
  password: string,
  attempts = 6,
): Promise<ApiSession> {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const login = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    lastStatus = login.status;
    if (login.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 16_000));
      continue;
    }
    if (!login.ok) throw new Error(`login ${email} falhou: ${login.status}`);
    const session = (await login.json()) as {
      data?: { accessToken?: string; tenant?: { id?: string } };
    };
    const token = session.data?.accessToken;
    const tenantId = session.data?.tenant?.id;
    if (!token || !tenantId) throw new Error(`sessão ${email} sem token/tenant`);
    return { token, tenantId };
  }
  throw new Error(`login ${email} falhou: ${lastStatus}`);
}

async function receptionSession(): Promise<ApiSession> {
  if (cachedReceptionSession) return cachedReceptionSession;
  cachedReceptionSession = await loginWithBackoff(RECEPTION.email, RECEPTION.password);
  return cachedReceptionSession;
}

function headers(token: string, tenantId: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
    'Content-Type': 'application/json',
  };
}

async function api<T>(
  path: string,
  init: RequestInit & { token: string; tenantId: string },
): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: { ...headers(init.token, init.tenantId), ...(init.headers ?? {}) },
  });
  const json = (await res.json()) as Envelope<T> & { error?: { message?: string; code?: string } };
  if (!res.ok) {
    throw new Error(
      `${init.method ?? 'GET'} ${path} falhou: ${res.status} ${json.error?.message ?? ''}`,
    );
  }
  return json.data as T;
}

export async function ensureOpenInstallmentForMaria(): Promise<{
  installmentId: string;
  unitId: string;
  patientId: string;
  balanceCents: number;
}> {
  const { token, tenantId } = await receptionSession();
  const patients = await api<Array<{ id: string; name: string }>>(
    `/patients?search=${encodeURIComponent(SEED_PATIENT)}&limit=20`,
    { token, tenantId },
  );
  const patient = (Array.isArray(patients) ? patients : []).find((row) =>
    row.name.includes('Maria'),
  );
  if (!patient) throw new Error('paciente Maria não encontrado');

  type InstallmentRow = {
    id: string;
    unitId: string;
    patientId: string;
    amountCents: number;
    paidCents: number;
    status: string;
  };

  /** Sem filtro de status a lista ordena por dueDate e afoga OPEN atrás de dezenas de PAID. */
  const listOpen = async () => {
    const statuses = ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'] as const;
    for (const status of statuses) {
      const rows = await api<InstallmentRow[]>(
        `/installments?patientId=${encodeURIComponent(patient.id)}&status=${status}&limit=50`,
        { token, tenantId },
      );
      const hit = (Array.isArray(rows) ? rows : []).find(
        (row) => row.amountCents - row.paidCents >= 200,
      );
      if (hit) return hit;
    }
    return undefined;
  };

  let open = await listOpen();
  if (!open) {
    const { ensureActiveRes01Plan } = await import('./treatment-plan');
    await ensureActiveRes01Plan(SEED_PATIENT);
    open = await listOpen();
  }
  if (!open) {
    const due = new Date();
    due.setDate(due.getDate() + 7);
    await api('/receivables', {
      token,
      tenantId,
      method: 'POST',
      body: JSON.stringify({
        patientId: patient.id,
        totalCents: 15000,
        installmentCount: 1,
        firstDueDate: due.toISOString().slice(0, 10),
        description: '[e2e] título para baixa',
      }),
    });
    open = await listOpen();
  }
  if (!open) throw new Error('parcela em aberto da Maria não encontrada');

  return {
    installmentId: open.id,
    unitId: open.unitId,
    patientId: open.patientId,
    balanceCents: open.amountCents - open.paidCents,
  };
}

export async function registerPaymentPixCash(
  installmentId: string,
  balanceCents: number,
): Promise<{ paymentId: string; amountCents: number }> {
  const { token, tenantId } = await receptionSession();
  const pix = Math.floor(balanceCents / 2);
  const cash = balanceCents - pix;
  const result = await api<{ paymentId: string }>(
    `/installments/${encodeURIComponent(installmentId)}/payments`,
    {
      token,
      tenantId,
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        amountCents: balanceCents,
        splits: [
          { method: 'PIX', amountCents: pix },
          { method: 'CASH', amountCents: cash },
        ],
      }),
    },
  );
  return { paymentId: result.paymentId, amountCents: balanceCents };
}
