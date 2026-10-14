import { OWNER } from './credentials';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3333';

/** Liga/desliga o parâmetro "agenda por cadeira" da clínica seed (padrão: desligado). */
export async function setChairsEnabled(enabled: boolean): Promise<void> {
  const login = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: OWNER.email, password: OWNER.password }),
  });
  if (!login.ok) throw new Error(`login owner falhou: ${login.status}`);
  const session = (await login.json()) as {
    data?: { accessToken?: string; tenant?: { id?: string } };
  };
  const token = session.data?.accessToken;
  const tenantId = session.data?.tenant?.id;
  if (!token || !tenantId) throw new Error('sessão owner sem token/tenant');

  const res = await fetch(`${API_URL}/api/v1/clinic`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ chairsEnabled: enabled }),
  });
  if (!res.ok) throw new Error(`PATCH /clinic falhou: ${res.status}`);
}
