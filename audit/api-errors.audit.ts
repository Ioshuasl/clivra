import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loginAs } from '../e2e/helpers/auth';
import { OWNER } from '../e2e/helpers/credentials';
import { OUT_DIR, saveJson } from './lib';

/** Força respostas de erro da API ao salvar um paciente e confere o toast mostrado. */
const SHOTS = join(OUT_DIR, 'erros');
mkdirSync(SHOTS, { recursive: true });

type Case = {
  nome: string;
  status?: number;
  body?: unknown;
  abort?: boolean;
  esperaTitulo: RegExp;
  esperaTexto: RegExp;
};

const CASES: Case[] = [
  { nome: 'servidor-500', status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Erro interno inesperado.' } }, esperaTitulo: /Erro no servidor/i, esperaTexto: /do nosso lado/i },
  { nome: 'sem-permissao-403', status: 403, body: { error: { code: 'FORBIDDEN', message: 'Permissão insuficiente para este recurso.' } }, esperaTitulo: /Sem permissão/i, esperaTexto: /permiss/i },
  { nome: 'muitas-tentativas-429', status: 429, body: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, esperaTitulo: /muitas tentativas/i, esperaTexto: /Aguarde/i },
  { nome: 'duplicado-409', status: 409, body: { error: { code: 'DUPLICATE', message: 'Já existe um paciente com este CPF.' } }, esperaTitulo: /./, esperaTexto: /Já existe um paciente/i },
  {
    nome: 'validacao-em-ingles',
    status: 400,
    body: { error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos.', details: { issues: [{ code: 'invalid_type', expected: 'string', received: 'undefined', path: ['phonePrimary'], message: 'Required' }, { code: 'too_small', minimum: 3, path: ['name'], message: 'String must contain at least 3 character(s)' }] } } },
    esperaTitulo: /Confira os dados/i,
    esperaTexto: /Telefone é obrigatório|Nome/i,
  },
  { nome: 'mensagem-tecnica', status: 400, body: { error: { code: 'VALIDATION_ERROR', message: 'endsAt deve ser após startsAt.' } }, esperaTitulo: /./, esperaTexto: /^(?!.*endsAt)/is },
  { nome: 'sem-internet', abort: true, esperaTitulo: /Sem conexão/i, esperaTexto: /internet/i },
  { nome: 'html-do-proxy-502', status: 502, body: '<html>Bad gateway</html>', esperaTitulo: /./, esperaTexto: /^(?!.*HTTP 502)(?!.*Bad gateway)/is },
  { nome: 'sessao-expirada-401', status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'Token de acesso inválido ou expirado.' } }, esperaTitulo: /./, esperaTexto: /./ },
];

test('API com erro: toast em português para cada tipo de falha', async ({ page }) => {
  await loginAs(page, OWNER);
  const resultados: Array<Record<string, unknown>> = [];
  for (const c of CASES.filter((x) => !process.env.ONLY || x.nome.includes(process.env.ONLY))) {
    await page.route('**/api/v1/patients', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      if (c.abort) return route.abort('failed');
      const isJson = typeof c.body !== 'string';
      return route.fulfill({
        status: c.status ?? 500,
        contentType: isJson ? 'application/json' : 'text/html',
        body: isJson ? JSON.stringify(c.body) : String(c.body),
      });
    });
    await page.goto('/app/pacientes');
    await page.getByRole('button', { name: 'Novo paciente' }).click();
    await page.getByLabel('Nome completo').fill('Paciente Teste Erro');
    await page.getByLabel('Telefone', { exact: true }).fill('11999990000');
    await page.getByRole('button', { name: 'Criar paciente' }).click();
    const toast = page.locator('[data-slot="toast"]').first();
    let titulo = '';
    let texto = '';
    let ok = true;
    try {
      await toast.waitFor({ state: 'visible', timeout: 6000 });
      titulo = (await toast.locator('[data-slot="toast-title"]').first().innerText().catch(() => '')).trim();
      texto = (await toast.locator('[data-slot="toast-description"]').first().innerText().catch(() => '')).trim();
      ok = c.esperaTitulo.test(titulo) && c.esperaTexto.test(texto);
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(SHOTS, `api-${c.nome}.png`) });
    } catch {
      ok = false;
      titulo = '(sem toast)';
    }
    resultados.push({ caso: c.nome, titulo, texto, ok });
    console.log('caso', c.nome, ok, titulo, '|', texto, '| url', page.url());
    await page.unroute('**/api/v1/patients');
    await page.reload();
    await page.waitForTimeout(1500);
    console.log('apos reload', page.url(), (await page.context().cookies()).map((x) => x.name).join(','));
  }
  saveJson('erros-api.json', resultados);
  console.log('\n' + resultados.map((r) => `${r.ok ? 'OK ' : 'FALHA'} ${String(r.caso).padEnd(24)} | ${String(r.titulo)} | ${String(r.texto)}`).join('\n'));
  expect(resultados.length).toBe(CASES.length);
});
