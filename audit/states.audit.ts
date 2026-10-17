import { test, type Page } from '@playwright/test';
import { loginAs } from '../e2e/helpers/auth';
import { DENTIST, OWNER, RECEPTION, SEED_PATIENT } from '../e2e/helpers/credentials';
import {
  chooseAnyPublicProfessional,
  getSeedClinicSlug,
  pickFirstPublicSlot,
} from '../e2e/helpers/public-booking';
import { SHOTS_DIR } from './lib';

/** Print do estado atual da tela (viewport) com nome legível. */
async function shot(page: Page, name: string, fullPage = false): Promise<void> {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS_DIR}/estado__${name}.png`, fullPage }).catch(() => undefined);
}

/** Fecha painel/diálogo aberto (botão Cancelar/Fechar; Esc como último recurso). */
async function closeSheet(page: Page): Promise<void> {
  for (const name of ['Cancelar', 'Fechar']) {
    const b = page.getByRole('dialog').getByRole('button', { name, exact: true }).first();
    if (await b.isVisible().catch(() => false)) {
      await b.click({ timeout: 5000 }).catch(() => undefined);
      await page.waitForTimeout(500);
      return;
    }
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}

async function safe(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.log(`[estado ${name}] não capturado: ${String(e).split('\n')[0]}`);
  }
}

test('estados das telas: formulários, diálogos, passos e erros (desktop)', async ({ browser }) => {
  test.setTimeout(900_000);
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'pt-BR' });
  const page = await ctx.newPage();

  // ---- Login: erro e campos --------------------------------------------------------
  await safe('login-erro', async () => {
    await page.goto('/login');
    await shot(page, '01-login-vazio');
    await page.getByLabel(/E-mail/i).fill('alguem@example.com');
    await page.getByLabel('Senha', { exact: true }).fill('senha-errada');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForTimeout(1500);
    await shot(page, '02-login-senha-errada');
  });
  await safe('signup', async () => {
    await page.goto('/signup');
    await shot(page, '03-cadastro-clinica');
  });

  // ---- Recepção ---------------------------------------------------------------------
  await loginAs(page, RECEPTION);
  await safe('inicio', async () => {
    await page.goto('/app');
    await page.waitForLoadState('networkidle');
    await shot(page, '04-inicio-recepcao', true);
  });

  await safe('pacientes', async () => {
    await page.goto('/app/pacientes');
    await page.waitForLoadState('networkidle');
    await shot(page, '05-pacientes-lista');
    await page.getByLabel('Buscar pacientes').fill('zzz-nada');
    await shot(page, '06-pacientes-busca-vazia');
    await page.getByLabel('Buscar pacientes').fill('');
    await page.getByRole('button', { name: 'Novo paciente' }).click();
    await shot(page, '07-paciente-novo-formulario');
    await page.getByRole('button', { name: 'Criar paciente' }).click();
    await shot(page, '08-paciente-novo-erros-validacao');
    await closeSheet(page);
  });

  await safe('ficha', async () => {
    await page.goto('/app/pacientes');
    await page.getByLabel('Buscar pacientes').fill('Maria');
    await page.getByRole('link', { name: /^Abrir paciente/ }).first().click();
    await page.waitForURL(/pacientes\//);
    await page.waitForLoadState('networkidle');
    await shot(page, '09-ficha-dados', true);
    for (const [tab, n] of [
      ['Responsáveis', '10'],
      ['Consentimentos', '11'],
      ['Timeline', '12'],
      ['Orçamentos', '13'],
      ['Financeiro', '14'],
    ] as const) {
      await page.getByRole('tab', { name: tab }).click().catch(() => undefined);
      await shot(page, `${n}-ficha-${tab.toLowerCase()}`);
    }
  });

  await safe('agenda', async () => {
    await page.goto('/app/agenda');
    await page.waitForLoadState('networkidle');
    await shot(page, '15-agenda-dia', true);
    await page.getByRole('button', { name: 'Semana' }).click();
    await shot(page, '16-agenda-semana');
    await page.getByRole('button', { name: 'Dia' }).click();
    await page.getByRole('button', { name: 'Novo agendamento' }).click();
    await shot(page, '17-agenda-novo-agendamento');
    await page.getByPlaceholder('Buscar paciente…').fill('Maria');
    await shot(page, '18-agenda-novo-agendamento-busca-paciente');
    await closeSheet(page);
    await page.getByRole('button', { name: 'Bloquear' }).click();
    await shot(page, '19-agenda-bloqueio');
    await closeSheet(page);
    await page.getByRole('button', { name: 'Fila de espera' }).click();
    await shot(page, '20-agenda-fila-de-espera');
  });

  await safe('inbox', async () => {
    await page.goto('/app/inbox');
    await page.waitForLoadState('networkidle');
    await shot(page, '21-whatsapp-inbox-lista');
    const first = page.getByRole('list', { name: 'Lista de conversas' }).getByRole('button').first();
    await first.click();
    await shot(page, '22-whatsapp-conversa-aberta');
  });

  await safe('orcamentos', async () => {
    await page.goto('/app/orcamentos');
    await page.waitForLoadState('networkidle');
    await shot(page, '23-orcamentos-lista');
    await page.getByRole('button', { name: 'Novo orçamento' }).click();
    await shot(page, '24-orcamento-novo');
    await closeSheet(page);
  });

  await safe('financeiro', async () => {
    await page.goto('/app/financeiro');
    await page.waitForLoadState('networkidle');
    await shot(page, '25-financeiro-painel', true);
    await page.getByRole('button', { name: 'Registrar movimentação' }).click();
    await shot(page, '26-financeiro-registrar-movimentacao');
    await closeSheet(page);
    const receber = page.getByRole('button', { name: 'Receber' }).first();
    await receber.click();
    await shot(page, '27-financeiro-receber-baixa');
    await closeSheet(page);
    await page.goto('/app/financeiro/relatorios');
    await page.waitForLoadState('networkidle');
    await shot(page, '28-financeiro-relatorios-sem-permissao');
  });

  // ---- Dono -------------------------------------------------------------------------
  await ctx.clearCookies();
  await loginAs(page, OWNER);
  await safe('relatorios', async () => {
    await page.goto('/app/relatorios');
    await page.waitForLoadState('networkidle');
    await shot(page, '29-relatorios-hub', true);
    await page.goto('/app/relatorios/receita');
    await page.waitForLoadState('networkidle');
    await shot(page, '30-relatorio-receita');
    await page.getByRole('button', { name: 'Exportar CSV' }).click();
    await shot(page, '31-relatorio-exportar-csv');
    await page.goto('/app/financeiro/relatorios');
    await page.waitForLoadState('networkidle');
    await shot(page, '32-financeiro-relatorios', true);
  });

  await safe('configuracoes', async () => {
    for (const [path, n, name] of [
      ['/app/primeiros-passos', '33', 'primeiros-passos'],
      ['/app/configuracoes/clinica', '34', 'config-clinica'],
      ['/app/configuracoes/horarios', '35', 'config-horarios'],
      ['/app/configuracoes/profissionais', '36', 'config-profissionais'],
      ['/app/configuracoes/membros', '37', 'config-membros'],
      ['/app/configuracoes/whatsapp', '38', 'config-whatsapp'],
      ['/app/configuracoes/auditoria', '39', 'config-auditoria'],
      ['/app/configuracoes/privacidade', '40', 'config-privacidade'],
      ['/app/assinatura', '41', 'assinatura'],
      ['/app/assinatura/checkout', '42', 'assinatura-checkout'],
    ] as const) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await shot(page, `${n}-${name}`, true);
    }
  });

  await safe('atendimento', async () => {
    await ctx.clearCookies();
    await loginAs(page, DENTIST);
    await page.goto('/app/agenda');
    await page.waitForLoadState('networkidle');
    const card = page.getByRole('button', { name: /Agendado|Confirmado|Em atendimento/ }).first();
    await card.click();
    await shot(page, '43-atendimento-detalhes-agendamento');
    const open = page.getByRole('button', { name: /Abrir atendimento|Iniciar atendimento/ }).first();
    await open.click();
    await page.waitForURL(/atendimento\//, { timeout: 30_000 });
    await page.waitForLoadState('networkidle');
    await shot(page, '44-atendimento-tela', true);
  });
  await ctx.close();

  // ---- Paciente (público, celular) ----------------------------------------------------
  const slug = await getSeedClinicSlug();
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR', isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  await safe('agendamento-publico', async () => {
    await mp.goto(`/agendar/${slug}`);
    await shot(mp, '50-publico-passo1-profissional');
    await chooseAnyPublicProfessional(mp);
    await mp.waitForTimeout(800);
    await shot(mp, '51-publico-passo2-horario');
    await pickFirstPublicSlot(mp);
    await shot(mp, '52-publico-passo3-dados');
    await mp.getByRole('button', { name: 'Enviar código' }).click().catch(() => undefined);
    await shot(mp, '53-publico-passo3-erros-validacao');
  });
  await mctx.close();

  // Desktop da página pública de agendamento e sistema em celular
  const d2 = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'pt-BR' });
  const dp = await d2.newPage();
  await safe('publico-desktop', async () => {
    await dp.goto(`/agendar/${slug}`);
    await shot(dp, '54-publico-desktop-passo1');
  });
  await d2.close();

  const m2 = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR', isMobile: true, hasTouch: true });
  const mp2 = await m2.newPage();
  await safe('app-celular', async () => {
    await loginAs(mp2, RECEPTION);
    for (const [path, name] of [
      ['/app', '60-celular-inicio'],
      ['/app/agenda', '61-celular-agenda'],
      ['/app/pacientes', '62-celular-pacientes'],
      ['/app/financeiro', '63-celular-financeiro'],
    ] as const) {
      await mp2.goto(path);
      await mp2.waitForLoadState('networkidle');
      await shot(mp2, name);
    }
    await mp2.goto('/app/pacientes');
    await mp2.getByRole('button', { name: 'Novo paciente' }).click();
    await shot(mp2, '64-celular-novo-paciente');
  });
  await m2.close();
  void SEED_PATIENT;
});
