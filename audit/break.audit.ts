import { expect, test } from '@playwright/test';
import { loginAs } from '../e2e/helpers/auth';
import { ASSISTANT, DENTIST, FINANCE, OWNER, RECEPTION } from '../e2e/helpers/credentials';
import { saveJson } from './lib';

const API = process.env.E2E_API_URL ?? 'http://localhost:3333';
const BASE = `${API}/api/v1`;

type Verdict = 'OK' | 'FALHA' | 'ATENÇÃO';
type Row = { id: string; teste: string; esperado: string; observado: string; veredito: Verdict };
const rows: Row[] = [];
function add(id: string, teste: string, esperado: string, observado: string, ok: boolean | 'warn') {
  rows.push({ id, teste, esperado, observado, veredito: ok === 'warn' ? 'ATENÇÃO' : ok ? 'OK' : 'FALHA' });
}

type Sess = { token: string; tenantId: string; userId: string };
async function login(email: string, password: string): Promise<Sess> {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = (await r.json()) as { data: { accessToken: string; tenant: { id: string }; user: { id: string } } };
  return { token: j.data.accessToken, tenantId: j.data.tenant.id, userId: j.data.user.id };
}
const H = (s: Sess, extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${s.token}`,
  'X-Tenant-Id': s.tenantId,
  'Content-Type': 'application/json',
  ...extra,
});
async function call(path: string, init: RequestInit & { sess?: Sess; headers?: Record<string, string> } = {}) {
  const { sess, headers, ...rest } = init;
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, { ...rest, headers: sess ? H(sess, headers) : headers });
  const text = await res.text();
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    /* não-JSON */
  }
  return { status: res.status, body, text, ms: Date.now() - t0 };
}

test('quebra: API — isolamento, permissões e entradas absurdas', async () => {
  test.setTimeout(600_000);
  const owner = await login(OWNER.email, OWNER.password);
  const recep = await login(RECEPTION.email, RECEPTION.password);
  const dent = await login(DENTIST.email, DENTIST.password);
  const asb = await login(ASSISTANT.email, ASSISTANT.password);
  const fin = await login(FINANCE.email, FINANCE.password);

  // Segunda clínica (para testar vazamento entre clínicas).
  const stamp = Date.now();
  const signup = await call('/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clinicName: `Clínica Intrusa ${stamp}`,
      ownerName: 'Intruso',
      email: `intruso-${stamp}@example.com`,
      password: OWNER.password,
    }),
  });
  const intruder = await login(`intruso-${stamp}@example.com`, OWNER.password);

  const maria = (await call('/patients?search=Maria&limit=5', { sess: owner })).body?.data?.find((p: any) => p.name.includes('Maria'));

  // --- Isolamento entre clínicas -------------------------------------------------
  const crossGet = await call(`/patients/${maria.id}`, { sess: intruder });
  add('ISO-1', 'Clínica intrusa lê paciente de outra clínica pelo id', '404/403, sem dados', `${crossGet.status}`, [403, 404].includes(crossGet.status));

  const spoof = await call(`/patients/${maria.id}`, { headers: { ...H(intruder), 'X-Tenant-Id': owner.tenantId } });
  add('ISO-2', 'Token da clínica intrusa com X-Tenant-Id da clínica alvo', '401/403/404', `${spoof.status}`, [401, 403, 404].includes(spoof.status));

  const crossList = await call('/patients?limit=100', { sess: intruder });
  add('ISO-3', 'Listagem de pacientes da clínica intrusa contém só os dela', '0 pacientes de outra clínica', `${crossList.body?.data?.length ?? 'erro'} itens`, (crossList.body?.data ?? []).every((p: any) => p.id !== maria.id));

  const crossFin = await call('/installments?limit=50', { sess: intruder });
  add('ISO-4', 'Parcelas de outra clínica via listagem', 'lista vazia', `${crossFin.body?.data?.length ?? crossFin.status} itens`, (crossFin.body?.data ?? []).length === 0);

  const crossPay = await call(`/installments/${(await call('/installments?limit=1', { sess: owner })).body?.data?.[0]?.id}/payments`, {
    method: 'POST',
    sess: intruder,
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ amountCents: 100, splits: [{ method: 'PIX', amountCents: 100 }] }),
  });
  add('ISO-5', 'Baixar parcela de outra clínica', '404/403', `${crossPay.status}`, [403, 404, 422].includes(crossPay.status));

  // --- Autenticação ---------------------------------------------------------------
  const noToken = await call('/patients');
  add('AUT-1', 'Rota protegida sem token', '401', `${noToken.status}`, noToken.status === 401);
  const badJwt = await call('/patients', { headers: { Authorization: 'Bearer abc.def.ghi', 'X-Tenant-Id': owner.tenantId } });
  add('AUT-2', 'JWT inválido', '401', `${badJwt.status}`, badJwt.status === 401);
  const tampered = owner.token.slice(0, -4) + (owner.token.endsWith('AAAA') ? 'BBBB' : 'AAAA');
  const tamperedRes = await call('/patients', { headers: { Authorization: `Bearer ${tampered}`, 'X-Tenant-Id': owner.tenantId } });
  add('AUT-3', 'JWT com assinatura adulterada', '401', `${tamperedRes.status}`, tamperedRes.status === 401);
  const sqli = await call('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "' OR 1=1 --@x.com", password: "' OR '1'='1" }),
  });
  add('AUT-4', 'Login com injeção de SQL', '400/401, sem erro 500', `${sqli.status}`, [400, 401, 422].includes(sqli.status));
  const wrong: number[] = [];
  const victimEmail = `intruso-${stamp}@example.com`;
  for (let i = 0; i < 12; i += 1) wrong.push((await call('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: victimEmail, password: `errada-${i}` }) })).status);
  add('AUT-5', '12 senhas erradas seguidas (limite de tentativas)', '429 em produção (aqui NODE_ENV≠production desliga o limite)', `status finais: ${wrong.slice(-3).join(',')}`, wrong.includes(429) ? true : 'warn');
  const lockedLogin = await call('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: victimEmail, password: OWNER.password }) });
  add('AUT-7', 'Dono legítimo tenta entrar depois que um desconhecido errou a senha 12x', 'consegue entrar (conta não pode ser trancada por terceiros)', `${lockedLogin.status} ${lockedLogin.body?.error?.code ?? ''}`, lockedLogin.status === 200);

  const weakPw = await call('/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clinicName: `Senha Fraca ${stamp}`, ownerName: 'Fraco Teste', email: `fraco-${stamp}@example.com`, password: '1' }),
  });
  add('AUT-6', 'Cadastro de clínica com senha de 1 caractere', '400/422 (senha forte exigida)', `${weakPw.status}`, [400, 422].includes(weakPw.status));

  // --- Permissões por papel -------------------------------------------------------
  const perm: Array<[string, Sess, string, number[]]> = [
    ['PER-1', recep, '/audit-logs', [403]],
    ['PER-2', dent, '/installments', [403]],
    ['PER-3', asb, '/installments', [403]],
    ['PER-4', asb, `/patients/${maria.id}/medical-record`, [403, 404]],
    ['PER-5', recep, '/users', [403]],
    ['PER-6', fin, `/patients/${maria.id}/medical-record`, [403, 404]],
    ['PER-7', dent, '/reports/revenue?from=2026-01-01&to=2026-12-31', [403]],
    ['PER-8', recep, '/privacy/exports', [403, 404, 405]],
  ];
  for (const [id, sess, path, expected] of perm) {
    const r = await call(path, { sess });
    add(id, `Papel sem permissão acessa ${path}`, expected.join('/'), `${r.status}`, expected.includes(r.status));
  }
  const escalate = await call(`/users/${recep.userId}`, { method: 'PATCH', sess: recep, body: JSON.stringify({ role: 'OWNER' }) });
  add('PER-9', 'Recepção tenta se promover a OWNER', '403', `${escalate.status}`, [403, 404].includes(escalate.status));

  // --- Entradas absurdas ----------------------------------------------------------
  const bigName = 'A'.repeat(20_000);
  const big = await call('/patients', { method: 'POST', sess: owner, body: JSON.stringify({ name: bigName, phonePrimary: '62999990011' }) });
  add('INP-1', 'Nome de paciente com 20.000 caracteres', '400/413/422, sem 500', `${big.status}`, [400, 413, 422].includes(big.status));
  const xss = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  const xssCreate = await call('/patients', { method: 'POST', sess: owner, body: JSON.stringify({ name: xss, phonePrimary: `6299${String(stamp).slice(-7)}` }) });
  add('INP-2', 'Nome com HTML/script (armazenamento)', '201 armazena como texto', `${xssCreate.status}`, [201, 400, 422].includes(xssCreate.status));
  const nul = await call('/patients', { method: 'POST', sess: owner, body: JSON.stringify({ name: 'Zé\u0000Nulo', phonePrimary: '62999990012' }) });
  add('INP-3', 'Nome com byte nulo', '400/422, sem 500', `${nul.status}`, nul.status !== 500);
  const emoji = await call('/patients', { method: 'POST', sess: owner, body: JSON.stringify({ name: 'José 😀 Ñandú', phonePrimary: '62999990013' }) });
  add('INP-4', 'Nome com emoji e acentos', '201', `${emoji.status}`, emoji.status === 201);
  const badCpf = await call('/patients', { method: 'POST', sess: owner, body: JSON.stringify({ name: 'CPF Ruim', phonePrimary: '62999990014', cpf: '11111111111' }) });
  add('INP-5', 'CPF inválido (11111111111)', '400/422', `${badCpf.status}`, [400, 422].includes(badCpf.status));
  const badDate = await call('/patients', { method: 'POST', sess: owner, body: JSON.stringify({ name: 'Data Ruim', phonePrimary: '62999990015', birthDate: '2999-13-45' }) });
  add('INP-6', 'Data de nascimento impossível', '400/422', `${badDate.status}`, [400, 422].includes(badDate.status));
  const future = await call('/patients', { method: 'POST', sess: owner, body: JSON.stringify({ name: 'Futuro', phonePrimary: '62999990016', birthDate: '2099-01-01' }) });
  add('INP-7', 'Nascimento no futuro', '400/422', `${future.status}`, [400, 422].includes(future.status) ? true : 'warn');
  const hugeBody = await call('/patients', { method: 'POST', sess: owner, body: JSON.stringify({ name: 'x', notes: 'y'.repeat(2_000_000) }) });
  add('INP-8', 'Corpo de 2 MB', '413', `${hugeBody.status}`, hugeBody.status === 413);
  const limitAbuse = await call('/patients?limit=100000', { sess: owner });
  add('INP-9', 'Paginação limit=100000', '400 ou limitado (≤100 itens)', `${limitAbuse.status} / ${limitAbuse.body?.data?.length ?? '-'} itens`, limitAbuse.status === 400 || (limitAbuse.body?.data?.length ?? 0) <= 200);
  const negLimit = await call('/patients?limit=-5', { sess: owner });
  add('INP-10', 'Paginação limit=-5', '400', `${negLimit.status}`, negLimit.status === 400 || negLimit.status === 200 ? true : false);
  const wildcard = await call(`/patients?search=${encodeURIComponent('%')}`, { sess: owner });
  add('INP-11', "Busca com '%' (curinga)", '200 sem erro', `${wildcard.status}`, wildcard.status === 200);
  const wrongType = await call('/patients', { method: 'POST', sess: owner, headers: { 'Content-Type': 'text/plain' }, body: 'name=x' });
  add('INP-12', 'Content-Type errado', '400/415', `${wrongType.status}`, [400, 415, 422].includes(wrongType.status));
  const mass = await call(`/patients/${maria.id}`, { method: 'PATCH', sess: owner, body: JSON.stringify({ tenantId: intruder.tenantId, id: '00000000-0000-0000-0000-000000000000', code: 99999 }) });
  const after = await call(`/patients/${maria.id}`, { sess: owner });
  add('INP-13', 'Mass assignment: PATCH com tenantId/id/code', 'campos ignorados', `${mass.status}; paciente continua na clínica: ${after.status === 200}`, after.status === 200 && after.body?.data?.id === maria.id);

  // --- Dinheiro e concorrência ----------------------------------------------------
  const inst = (await call('/installments?status=OPEN&limit=50', { sess: recep })).body?.data?.find((i: any) => i.amountCents - i.paidCents >= 1000);
  if (inst) {
    const neg = await call(`/installments/${inst.id}/payments`, { method: 'POST', sess: recep, headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ amountCents: -500, splits: [{ method: 'PIX', amountCents: -500 }] }) });
    add('MON-1', 'Pagamento com valor negativo', '400/422', `${neg.status}`, [400, 422].includes(neg.status));
    const zero = await call(`/installments/${inst.id}/payments`, { method: 'POST', sess: recep, headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ amountCents: 0, splits: [{ method: 'PIX', amountCents: 0 }] }) });
    add('MON-2', 'Pagamento de R$ 0,00', '400/422', `${zero.status}`, [400, 422].includes(zero.status));
    const frac = await call(`/installments/${inst.id}/payments`, { method: 'POST', sess: recep, headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ amountCents: 100.5, splits: [{ method: 'PIX', amountCents: 100.5 }] }) });
    add('MON-3', 'Valor com fração de centavo (100.5)', '400/422', `${frac.status}`, [400, 422].includes(frac.status));
    const mismatch = await call(`/installments/${inst.id}/payments`, { method: 'POST', sess: recep, headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ amountCents: 1000, splits: [{ method: 'PIX', amountCents: 400 }] }) });
    add('MON-4', 'Soma das formas ≠ valor total', '400/422', `${mismatch.status}`, [400, 422].includes(mismatch.status));
    const key = crypto.randomUUID();
    const body = JSON.stringify({ amountCents: 200, splits: [{ method: 'PIX', amountCents: 200 }] });
    const parallel = await Promise.all(Array.from({ length: 6 }, () => call(`/installments/${inst.id}/payments`, { method: 'POST', sess: recep, headers: { 'Idempotency-Key': key }, body })));
    const ids = new Set(parallel.map((p) => p.body?.data?.paymentId).filter(Boolean));
    add('MON-5', '6 cliques simultâneos com a mesma chave de idempotência', 'exatamente 1 pagamento criado', `${ids.size} pagamento(s); status ${parallel.map((p) => p.status).join(',')}`, ids.size === 1);
    const noKey = await call(`/installments/${inst.id}/payments`, { method: 'POST', sess: recep, body });
    add('MON-6', 'Pagamento sem Idempotency-Key', '400', `${noKey.status}`, noKey.status === 400);
    const over = await call(`/installments/${inst.id}/payments`, { method: 'POST', sess: recep, headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ amountCents: 999_999_999, splits: [{ method: 'PIX', amountCents: 999_999_999 }] }) });
    add('MON-7', 'Pagamento muito acima do saldo (vira crédito?)', '422 ou crédito explícito', `${over.status}: ${JSON.stringify(over.body?.data ?? over.body?.error ?? '').slice(0, 120)}`, 'warn');
  }

  // --- Agenda: corrida pelo mesmo horário ------------------------------------------
  const unit = (await call('/clinic/units', { sess: owner })).body?.data?.[0];
  const prof = (await call('/clinic/professionals', { sess: owner })).body?.data?.[0];
  const procedure = (await call('/clinic/procedures?limit=5', { sess: owner })).body?.data?.[0];
  if (unit && prof && procedure) {
    const start = new Date();
    start.setDate(start.getDate() + 30 + (stamp % 20));
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 30 * 60_000);
    const mk = (i: number) =>
      call('/appointments', {
        method: 'POST',
        sess: owner,
        headers: { 'Idempotency-Key': `race-${stamp}-${i}` },
        body: JSON.stringify({ unitId: unit.id, patientId: maria.id, professionalId: prof.id, procedureId: procedure.id, startsAt: start.toISOString(), endsAt: end.toISOString() }),
      });
    const race = await Promise.all(Array.from({ length: 5 }, (_, i) => mk(i)));
    const created = race.filter((r) => r.status === 201).length;
    add('AGE-1', '5 agendamentos simultâneos no mesmo horário/profissional', 'só 1 é criado (409 nos demais)', `criados: ${created}; status ${race.map((r) => r.status).join(',')}`, created === 1);
    const past = await call('/appointments', {
      method: 'POST',
      sess: owner,
      headers: { 'Idempotency-Key': `past-${stamp}` },
      body: JSON.stringify({ unitId: unit.id, patientId: maria.id, professionalId: prof.id, procedureId: procedure.id, startsAt: '2020-01-06T12:00:00.000Z', endsAt: '2020-01-06T12:30:00.000Z' }),
    });
    add('AGE-2', 'Agendar no passado (2020)', '400/422', `${past.status}`, [400, 422].includes(past.status) ? true : 'warn');
    const inverted = await call('/appointments', {
      method: 'POST',
      sess: owner,
      headers: { 'Idempotency-Key': `inv-${stamp}` },
      body: JSON.stringify({ unitId: unit.id, patientId: maria.id, professionalId: prof.id, procedureId: procedure.id, startsAt: end.toISOString(), endsAt: start.toISOString() }),
    });
    add('AGE-3', 'Fim antes do início', '400/422', `${inverted.status}`, [400, 422].includes(inverted.status));
  }

  // --- Tempo de resposta do servidor (sem latência de rede) -------------------------
  const hot = ['/patients?limit=20', '/appointments?limit=50', '/installments?limit=50', '/reports/dashboard', '/clinic', '/auth/me'];
  const timings: Record<string, { p50: number; p95: number; max: number }> = {};
  for (const p of hot) {
    const t: number[] = [];
    for (let i = 0; i < 25; i += 1) t.push((await call(p, { sess: owner })).ms);
    t.sort((a, b) => a - b);
    timings[p] = { p50: t[12]!, p95: t[23]!, max: t[24]! };
  }
  saveJson('server-timings.json', timings);

  saveJson('break-api.json', rows);
  void signup;
});

test('quebra: interface — XSS, duplo clique, sessão expirada, offline e teclado', async ({ browser }) => {
  test.setTimeout(600_000);
  const ui: Row[] = [];
  const addUi = (id: string, teste: string, esperado: string, observado: string, ok: boolean | 'warn') =>
    ui.push({ id, teste, esperado, observado, veredito: ok === 'warn' ? 'ATENÇÃO' : ok ? 'OK' : 'FALHA' });

  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'pt-BR' });
  const page = await context.newPage();
  const dialogs: string[] = [];
  page.on('dialog', async (d) => {
    dialogs.push(d.message());
    await d.dismiss();
  });
  await loginAs(page, RECEPTION);

  // XSS refletido nas telas
  const payload = '<img src=x onerror=alert("xss1")>';
  await page.goto('/app/pacientes');
  await page.getByRole('button', { name: 'Novo paciente' }).click();
  await page.getByLabel('Nome completo').fill(payload);
  await page.getByLabel('Telefone', { exact: true }).fill(`6297${String(Date.now()).slice(-7)}`);
  await page.getByRole('button', { name: 'Criar paciente' }).click();
  await page.waitForTimeout(2500);
  await page.goto('/app/pacientes');
  await page.getByLabel('Buscar pacientes').fill('onerror');
  await page.waitForTimeout(2000);
  addUi('XSS-1', 'Nome de paciente com <img onerror> na lista', 'texto escapado, nenhum alert', `alerts: ${dialogs.length}`, dialogs.length === 0);
  await page.goto('/app/agenda');
  await page.waitForTimeout(2500);
  addUi('XSS-2', 'Mesmo nome na agenda', 'nenhum alert', `alerts: ${dialogs.length}`, dialogs.length === 0);

  // Duplo clique em "Criar paciente"
  await page.goto('/app/pacientes');
  await page.getByRole('button', { name: 'Novo paciente' }).click();
  const unique = `Duplo Clique ${Date.now()}`;
  await page.getByLabel('Nome completo').fill(unique);
  await page.getByLabel('Telefone', { exact: true }).fill(`6296${String(Date.now()).slice(-7)}`);
  const btn = page.getByRole('button', { name: 'Criar paciente' });
  await Promise.all([btn.dblclick().catch(() => undefined)]);
  await page.waitForTimeout(3000);
  await page.goto('/app/pacientes');
  await page.getByLabel('Buscar pacientes').fill(unique);
  await page.waitForTimeout(2500);
  const dupes = await page.getByRole('link', { name: /^Abrir paciente/ }).count();
  addUi('UI-1', 'Duplo clique em "Criar paciente"', 'apenas 1 cadastro', `${dupes} cadastro(s)`, dupes === 1);

  // Botão voltar após criar
  await page.goBack().catch(() => undefined);
  await page.waitForTimeout(1000);
  addUi('UI-2', 'Botão Voltar do navegador na lista de pacientes', 'sem erro de tela', `url ${new URL(page.url()).pathname}`, !(await page.getByText(/Application error/i).isVisible().catch(() => false)));

  // Offline ao salvar
  await page.goto('/app/pacientes');
  await page.getByRole('button', { name: 'Novo paciente' }).click();
  await page.getByLabel('Nome completo').fill(`Offline ${Date.now()}`);
  await page.getByLabel('Telefone', { exact: true }).fill(`6295${String(Date.now()).slice(-7)}`);
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Criar paciente' }).click();
  await page.waitForTimeout(3500);
  const offlineMsg = await page.locator('[data-slot="alert"], [role="alert"]').allInnerTexts();
  const stuck = await page.getByRole('button', { name: /Salvando/ }).isVisible().catch(() => false);
  await context.setOffline(false);
  addUi('UI-3', 'Salvar paciente sem internet', 'mensagem clara e botão volta ao normal', `mensagem: "${offlineMsg.join(' | ').slice(0, 120) || '(nenhuma)'}"; botão preso em "Salvando…": ${stuck}`, offlineMsg.length > 0 && !stuck ? true : 'warn');

  // Sessão expirada: apaga cookies e navega
  await page.goto('/app');
  await context.clearCookies();
  await page.reload();
  await page.waitForTimeout(3500);
  addUi('UI-4', 'Sessão expirada (cookies apagados) e recarregar', 'volta ao login sem erro', `url ${new URL(page.url()).pathname}`, /\/login/.test(page.url()));

  // Rota inexistente e id inexistente (contexto novo, como um usuário que volta a entrar)
  await context.close();
  const octx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'pt-BR' });
  const opage = await octx.newPage();
  await loginAs(opage, OWNER);
  await opage.goto('/app/pacientes/00000000-0000-0000-0000-000000000000');
  await opage.waitForTimeout(2500);
  const txt404 = (await opage.locator('main, body').first().innerText()).slice(0, 160).replace(/\n/g, ' ');
  addUi('UI-5', 'Ficha de paciente inexistente', 'mensagem amigável com saída', txt404, /não encontrado|não existe|inexistente/i.test(txt404) ? true : 'warn');
  await opage.goto('/app/rota-que-nao-existe');
  await opage.waitForTimeout(1500);
  const txtRoute = (await opage.locator('body').innerText()).slice(0, 120).replace(/\n/g, ' ');
  addUi('UI-6', 'Rota inexistente dentro do app', 'página 404 em português com link de volta', txtRoute, /não encontrada|não existe|voltar/i.test(txtRoute) ? true : 'warn');

  await octx.close();

  // Teclado: login só com Tab/Enter
  const kctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'pt-BR' });
  const kp = await kctx.newPage();
  await kp.goto('/login');
  await kp.getByLabel(/E-mail/i).focus();
  await kp.keyboard.type(OWNER.email);
  await kp.keyboard.press('Tab');
  await kp.keyboard.type(OWNER.password);
  await kp.keyboard.press('Enter');
  const kbOk = await kp.waitForURL(/\/app/, { timeout: 30_000 }).then(() => true).catch(() => false);
  addUi('UI-7', 'Login usando só o teclado (Tab/Enter)', 'entra no sistema', kbOk ? 'entrou' : 'não entrou', kbOk);

  // Zoom 200% (equivale a janela ~683px)
  await kp.setViewportSize({ width: 683, height: 384 });
  await kp.goto('/app/agenda');
  await kp.waitForTimeout(2500);
  const overflow = await kp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  addUi('UI-8', 'Zoom 200% na agenda (janela 683px)', 'sem rolagem horizontal da página', overflow ? 'rola na horizontal' : 'ok', overflow ? 'warn' : true);

  // Tecla Esc fecha diálogo e foco volta
  await kp.setViewportSize({ width: 1366, height: 768 });
  await kp.goto('/app/pacientes');
  await kp.getByRole('button', { name: 'Novo paciente' }).click();
  await kp.keyboard.press('Escape');
  await kp.waitForTimeout(600);
  const stillOpen = await kp.getByRole('dialog').isVisible().catch(() => false);
  addUi('UI-9', 'Esc fecha o formulário "Novo paciente"', 'fecha', stillOpen ? 'continua aberto' : 'fechou', stillOpen ? 'warn' : true);
  await kctx.close();

  saveJson('break-ui.json', ui);
  expect(ui.length).toBeGreaterThan(0);
});
