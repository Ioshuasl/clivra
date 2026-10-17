import { test } from '@playwright/test';
import { loginAs } from '../e2e/helpers/auth';
import {
  ASSISTANT,
  DENTIST,
  FINANCE,
  OWNER,
  RECEPTION,
  type E2eUser,
} from '../e2e/helpers/credentials';
import { getSeedClinicSlug } from '../e2e/helpers/public-booking';
import {
  BR_TO_EU,
  SHOTS_DIR,
  pageHeuristics,
  saveJson,
  throttle,
  trackApi,
} from './lib';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3333';

type Plan = { role: string; user: E2eUser; routes: string[] };

async function apiIds(user: E2eUser) {
  const login = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  const body = (await login.json()) as { data: { accessToken: string; tenant: { id: string } } };
  const h = { Authorization: `Bearer ${body.data.accessToken}`, 'X-Tenant-Id': body.data.tenant.id };
  const patients = (await (await fetch(`${API_URL}/api/v1/patients?search=Maria&limit=5`, { headers: h })).json()) as {
    data: Array<{ id: string; name: string }>;
  };
  const appts = (await (await fetch(`${API_URL}/api/v1/appointments?status=IN_SERVICE&limit=5`, { headers: h })).json().catch(() => ({}))) as {
    data?: Array<{ id: string }>;
  };
  return {
    patientId: patients.data.find((p) => p.name.includes('Maria'))?.id ?? '',
    appointmentId: appts.data?.[0]?.id ?? '',
  };
}

test('crawl: todas as telas por papel (desktop 1366x768, local e Brasil→Europa)', async ({ browser }) => {
  const ids = await apiIds(OWNER);
  const slug = await getSeedClinicSlug();

  const owner = [
    '/app',
    '/app/primeiros-passos',
    '/app/pacientes',
    `/app/pacientes/${ids.patientId}`,
    '/app/agenda',
    '/app/inbox',
    '/app/orcamentos',
    '/app/financeiro',
    '/app/financeiro/relatorios',
    '/app/relatorios',
    '/app/relatorios/receita',
    '/app/relatorios/faltas',
    '/app/relatorios/producao',
    '/app/relatorios/overdue',
    '/app/configuracoes/clinica',
    '/app/configuracoes/horarios',
    '/app/configuracoes/profissionais',
    '/app/configuracoes/procedimentos',
    '/app/configuracoes/membros',
    '/app/configuracoes/whatsapp',
    '/app/configuracoes/anamnese',
    '/app/configuracoes/auditoria',
    '/app/configuracoes/privacidade',
    '/app/assinatura',
    ...(ids.appointmentId ? [`/app/atendimento/${ids.appointmentId}`] : []),
  ];
  const plans: Plan[] = [
    { role: 'owner', user: OWNER, routes: owner },
    { role: 'recepcao', user: RECEPTION, routes: ['/app', '/app/pacientes', '/app/agenda', '/app/inbox', '/app/orcamentos', '/app/financeiro'] },
    { role: 'dentista', user: DENTIST, routes: ['/app', '/app/agenda', '/app/pacientes', '/app/relatorios/producao'] },
    { role: 'financeiro', user: FINANCE, routes: ['/app', '/app/financeiro', '/app/financeiro/relatorios', '/app/relatorios'] },
    { role: 'asb', user: ASSISTANT, routes: ['/app', '/app/agenda'] },
  ];

  const rows: unknown[] = [];

  for (const plan of plans) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'pt-BR' });
    const page = await context.newPage();
    await loginAs(page, plan.user);
    const { calls, errors } = trackApi(page);

    for (const mode of ['local', 'br-eu'] as const) {
      if (mode === 'br-eu') {
        await throttle(context, page, BR_TO_EU);
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      }
      for (const route of plan.routes) {
        calls.length = 0;
        errors.length = 0;
        const t0 = Date.now();
        let h1At = -1;
        let idleAt = -1;
        let status = 0;
        try {
          const res = await page.goto(route, { waitUntil: 'commit', timeout: 90_000 });
          status = res?.status() ?? 0;
          await page.locator('h1').first().waitFor({ state: 'visible', timeout: 60_000 });
          h1At = Date.now() - t0;
          await page.waitForLoadState('networkidle', { timeout: 60_000 });
          idleAt = Date.now() - t0;
        } catch {
          /* registra o que deu */
        }
        const heur = mode === 'local' ? await pageHeuristics(page).catch(() => null) : null;
        const slugName = route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').slice(0, 60) || 'home';
        if (mode === 'local') {
          await page.screenshot({ path: `${SHOTS_DIR}/${plan.role}__${slugName}.png` }).catch(() => undefined);
          await page
            .screenshot({ path: `${SHOTS_DIR}/completa__${plan.role}__${slugName}.png`, fullPage: true })
            .catch(() => undefined);
        }
        const slowest = [...calls].sort((a, b) => b.ms - a.ms).slice(0, 3);
        rows.push({
          role: plan.role,
          route: route.replace(ids.patientId, ':paciente').replace(ids.appointmentId, ':atendimento'),
          mode,
          httpStatus: status,
          h1Ms: h1At,
          idleMs: idleAt,
          apiCalls: calls.length,
          apiSlowest: slowest,
          apiBytes: calls.reduce((s, c) => s + c.bytes, 0),
          apiErrors: calls.filter((c) => c.status >= 400).map((c) => `${c.status} ${c.method} ${c.path}`),
          jsErrors: [...errors],
          heur,
        });
      }
    }
    await context.close();
  }

  // Telas públicas (sem login).
  const pub = ['/login', '/signup', '/forgot-password', `/agendar/${slug}`];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'pt-BR' });
  const pg = await ctx.newPage();
  const { calls, errors } = trackApi(pg);
  for (const mode of ['local', 'br-eu'] as const) {
    if (mode === 'br-eu') {
      await throttle(ctx, pg, BR_TO_EU);
      const cdp = await ctx.newCDPSession(pg);
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    }
    for (const route of pub) {
      calls.length = 0;
      errors.length = 0;
      const t0 = Date.now();
      await pg.goto(route, { waitUntil: 'commit' });
      await pg.locator('h1, h2').first().waitFor({ state: 'visible', timeout: 60_000 }).catch(() => undefined);
      const h1At = Date.now() - t0;
      await pg.waitForLoadState('networkidle').catch(() => undefined);
      const idleAt = Date.now() - t0;
      const heur = mode === 'local' ? await pageHeuristics(pg).catch(() => null) : null;
      if (mode === 'local') {
        await pg.screenshot({ path: `${SHOTS_DIR}/publico__${route.replace(/[^a-z0-9]+/gi, '_').slice(0, 50)}.png` });
      }
      rows.push({
        role: 'publico',
        route: route.replace(slug, ':slug'),
        mode,
        h1Ms: h1At,
        idleMs: idleAt,
        apiCalls: calls.length,
        apiSlowest: [...calls].sort((a, b) => b.ms - a.ms).slice(0, 3),
        apiErrors: calls.filter((c) => c.status >= 400).map((c) => `${c.status} ${c.method} ${c.path}`),
        jsErrors: [...errors],
        heur,
      });
    }
  }
  await ctx.close();

  // Mobile: só estouro horizontal e captura (cliente usa celular no balcão).
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR', isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  await loginAs(mp, OWNER);
  for (const route of ['/app', '/app/pacientes', '/app/agenda', '/app/financeiro', '/app/orcamentos', '/app/relatorios']) {
    await mp.goto(route, { waitUntil: 'networkidle' }).catch(() => undefined);
    const heur = await pageHeuristics(mp).catch(() => null);
    await mp.screenshot({ path: `${SHOTS_DIR}/mobile__${route.replace(/[^a-z0-9]+/gi, '_').slice(0, 40)}.png` }).catch(() => undefined);
    rows.push({ role: 'owner', route, mode: 'mobile-390', overflowX: heur?.overflowX, smallTargets: heur?.smallTargets, tinyText: heur?.tinyText });
  }
  await mctx.close();

  saveJson('crawl.json', rows);
});
