import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loginAs } from '../e2e/helpers/auth';
import { OWNER } from '../e2e/helpers/credentials';
import { OUT_DIR, saveJson } from './lib';

/**
 * Auditoria de erros de formulário: abre cada formulário (modal/painel/página), envia VAZIO e
 * registra o que a pessoa vê — borda vermelha, mensagem abaixo do campo, toast, texto em inglês.
 */
const SHOTS = join(OUT_DIR, 'erros');
mkdirSync(SHOTS, { recursive: true });

const PAGES = [
  '/app/pacientes',
  '/app/agenda',
  '/app/orcamentos',
  '/app/financeiro/pagar',
  '/app/financeiro/caixa',
  '/app/financeiro/receber',
  '/app/configuracoes/cadeiras',
  '/app/configuracoes/membros',
  '/app/configuracoes/procedimentos',
  '/app/configuracoes/profissionais',
  '/app/configuracoes/horarios',
  '/app/configuracoes/clinica',
  '/app/configuracoes/privacidade',
  '/app/configuracoes/anamnese',
  '/app/whatsapp',
];

const OPENERS = /^(novo|nova|adicionar|convidar|criar|registrar|abrir caixa|fechar caixa|bloquear|nova exceção|nova conta|nova saída|novo lançamento|sangria|suprimento|cadastrar|incluir|enviar)/i;
const ENGLISH = /\b(required|invalid|string must|expected|undefined|unrecognized|must contain|number must|too small|too big)\b|startsAt|endsAt|Dados inválidos\.?$/i;

type Row = {
  pagina: string;
  abriu: string;
  campos_vermelhos: number;
  mensagens_sob_campo: string[];
  alertas_ou_toast: string[];
  texto_em_ingles: string[];
  veredito: string;
};
const rows: Row[] = [];

async function snapshot(page: Page, scope: ReturnType<Page['locator']>) {
  return scope.evaluate((root) => {
    const visible = (el: Element) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const invalid = [...root.querySelectorAll('[aria-invalid="true"], [data-invalid="true"]')].filter(visible);
    const isRed = (el: Element) => {
      const c = getComputedStyle(el as HTMLElement);
      return c.borderColor.includes('185, 74, 85') || c.boxShadow.includes('185, 74, 85');
    };
    // Conta cada campo com erro e confere se o desenho do próprio campo (ou da caixa em volta) ficou vermelho.
    const fields = invalid.filter((el) => el.matches('[data-slot="field"]') || el.matches('input,textarea,select'));
    const redBorder = fields.filter((el) => {
      const targets = el.matches('input,textarea,select')
        ? [el, el.closest('[data-slot="date-picker"],[data-slot="time-picker"],[data-slot="input-group"]') ?? el]
        : [...el.querySelectorAll('input:not([type=hidden]),textarea,select,[data-slot="date-picker"],[data-slot="time-picker"],[data-slot="input-group"],[data-slot="select-trigger"]')];
      return targets.some(isRed);
    });
    const msgs = [...root.querySelectorAll('[data-slot="field-error"], [id$="-error"], .text-destructive')]
      .filter(visible)
      .map((e) => (e.textContent ?? '').trim())
      .filter(Boolean);
    const alerts = [...root.querySelectorAll('[role="alert"]')].filter(visible).map((e) => (e.textContent ?? '').trim()).filter(Boolean);
    return { invalid: invalid.length, red: redBorder.length, msgs, alerts };
  });
}

test('formulários: envio vazio mostra erros amigáveis', async ({ page }) => {
  await loginAs(page, OWNER);
  let n = 0;
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await page.waitForTimeout(1200);
    const labels = await page
      .locator('main button:visible, [data-slot="page"] button:visible, button:visible')
      .evaluateAll((els, src) => {
        const re = new RegExp(src, 'i');
        return [...new Set(els.map((e) => (e.textContent ?? '').trim()).filter((t) => t && t.length < 40 && re.test(t)))];
      }, OPENERS.source);
    for (const label of labels.filter((l) => !/nova vers/i.test(l))) {
      await page.goto(path);
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await page.waitForTimeout(800);
      const opener = page.getByRole('button', { name: label, exact: true }).first();
      if (!(await opener.isVisible().catch(() => false))) continue;
      await opener.click({ timeout: 4000 }).catch(() => undefined);
      await page.waitForTimeout(1200);
      const dialog = page.getByRole('dialog').last();
      const isDialog = await dialog.isVisible().catch(() => false);
      const scope = isDialog ? dialog : page.locator('main');
      const submit = scope.locator('button[type="submit"]:visible').first();
      if (!(await submit.isVisible().catch(() => false))) {
        await page.keyboard.press('Escape').catch(() => undefined);
        continue;
      }
      await submit.click({ timeout: 4000 }).catch(() => undefined);
      await page.waitForTimeout(1500);
      const stillOpen = isDialog ? await dialog.isVisible().catch(() => false) : true;
      const snap = stillOpen
        ? await snapshot(page, scope)
        : { invalid: 0, red: 0, msgs: [] as string[], alerts: [] as string[] };
      const toasts = await page.locator('[data-slot="toast"]').allInnerTexts().catch(() => [] as string[]);
      const all = [...snap.msgs, ...snap.alerts, ...toasts];
      const english = all.filter((t) => ENGLISH.test(t));
      const hasFieldFeedback = snap.msgs.length > 0 && snap.invalid > 0;
      let veredito = 'OK';
      if (!stillOpen) veredito = 'FECHOU SEM VALIDAR (enviou vazio?)';
      else if (snap.invalid === 0 && snap.msgs.length === 0 && snap.alerts.length === 0 && toasts.length === 0) veredito = 'SEM FEEDBACK (ou não exige campo)';
      else if (english.length) veredito = 'TEXTO EM INGLÊS/TÉCNICO';
      else if (!hasFieldFeedback && (snap.alerts.length || toasts.length)) veredito = 'ERRO SÓ NO ALERTA (sem borda no campo)';
      else if (snap.msgs.length > 0 && snap.red === 0) veredito = 'MENSAGEM SEM BORDA VERMELHA';
      rows.push({
        pagina: path,
        abriu: label,
        campos_vermelhos: snap.red,
        mensagens_sob_campo: snap.msgs,
        alertas_ou_toast: [...snap.alerts, ...toasts],
        texto_em_ingles: english,
        veredito,
      });
      n += 1;
      await page.screenshot({ path: join(SHOTS, `${String(n).padStart(2, '0')}-${path.replace(/\W+/g, '_')}-${label.replace(/\W+/g, '_')}.png`) });
      await page.keyboard.press('Escape').catch(() => undefined);
    }
  }
  saveJson('erros-formularios.json', rows);
  console.log('\n' + rows.map((r) => `${r.veredito.padEnd(40)} ${r.pagina} › ${r.abriu} | borda_vermelha=${r.campos_vermelhos} | msgs=${JSON.stringify(r.mensagens_sob_campo)} | alertas=${JSON.stringify(r.alertas_ou_toast)}`).join('\n'));
  expect(rows.length).toBeGreaterThan(0);
});
