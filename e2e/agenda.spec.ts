import { expect, test } from './helpers/fixtures';
import type { Page } from '@playwright/test';
import { setChairsEnabled } from './helpers/clinic';
import { SEED_CHAIR, SEED_PATIENT } from './helpers/credentials';

async function closeOpenDialog(page: Page): Promise<void> {
  const overlay = page.locator('[data-slot="dialog-overlay"]');
  if (!(await overlay.first().isVisible().catch(() => false))) return;

  // Base UI: Escape nem sempre fecha; preferir botões explícitos.
  for (const name of ['Fechar', 'Cancelar'] as const) {
    const btn = page.getByRole('button', { name, exact: true });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true });
      break;
    }
  }
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(200);

  if (await overlay.first().isVisible().catch(() => false)) {
    await page.evaluate(() => {
      document.querySelectorAll('[data-slot="dialog-portal"]').forEach((node) => node.remove());
      document.body.style.pointerEvents = '';
      document.body.removeAttribute('data-scroll-locked');
    });
  }
  await expect(overlay).toHaveCount(0, { timeout: 5_000 }).catch(() => undefined);
}

test.describe('Agenda (E4a)', () => {
  test('visão dia/semana por profissional (cadeira desligada por padrão)', async ({ page }) => {
    await page.goto('/app/agenda');
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('button', { name: 'Dia' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Semana' })).toBeVisible();
    await expect(page.getByLabel('Profissional')).toBeVisible();
    // Sem "agenda por cadeira" ligada na clínica, o alternador Profissional/Cadeira não aparece.
    await expect(page.getByRole('button', { name: 'Cadeira' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Dia' }).click();
    await expect(page.getByRole('gridcell').first()).toBeVisible();
  });

  test('visão por cadeira quando a clínica liga "agenda por cadeira"', async ({ page }) => {
    await setChairsEnabled(true);
    try {
      await page.goto('/app/agenda');
      await expect(page.getByRole('button', { name: 'Profissional' })).toBeVisible({ timeout: 45_000 });
      await page.getByRole('button', { name: 'Cadeira' }).click();
      await expect(page.getByLabel('Cadeira')).toBeVisible();
      await expect(page.getByLabel('Cadeira')).toContainText(SEED_CHAIR);
    } finally {
      await setChairsEnabled(false);
    }
  });

  test('cria agendamento em ≤3 interações e confirma status', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/app/agenda');
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();

    // Dia + manhã no expediente (grade 7–20; clínica seed 8–18). Semana+fração alta
    // abria slot perto/após 18h → "Horário fora do expediente".
    await page.getByRole('button', { name: 'Dia' }).click();
    // Depois dos feriados fictícios do seed (que ficam nas próximas 3 semanas).
    const daysAhead = 30 + (Date.now() % 21);
    for (let i = 0; i < daysAhead; i += 1) {
      await page.getByRole('button', { name: 'Próximo' }).click();
    }
    // Garante dia útil (seg–sex): avança no máx. 6 dias se cair em fim de semana.
    for (let i = 0; i < 6; i += 1) {
      const label = (
        await page.getByRole('gridcell').first().getAttribute('aria-label')
      )?.toLowerCase() ?? '';
      const weekend = label.includes('sáb') || label.includes('sab') || label.includes('dom');
      if (!weekend) break;
      await page.getByRole('button', { name: 'Próximo' }).click();
    }

    const cell = page.getByRole('gridcell').first();
    await expect(cell).toBeVisible();
    const box = await cell.boundingBox();
    // ~10h–14h (fracões baixas/médias dentro de 8–18).
    const fracs = [0.28, 0.35, 0.42, 0.5, 0.22, 0.55];
    let opened = false;
    for (const frac of fracs) {
      await closeOpenDialog(page);
      await cell.click({
        position: { x: 24, y: Math.max(40, Math.floor((box?.height ?? 480) * frac)) },
        force: true,
      });
      const search = page.getByPlaceholder('Buscar paciente…');
      // O painel anima ao abrir: espera de verdade antes de concluir que não abriu.
      const shown = await search
        .waitFor({ state: 'visible', timeout: 4_000 })
        .then(() => true)
        .catch(() => false);
      if (shown) {
        opened = true;
        break;
      }
      await closeOpenDialog(page);
    }
    expect(opened).toBe(true);
    await expect(page.getByRole('dialog').getByText('Novo agendamento', { exact: true })).toBeVisible();

    await page.getByPlaceholder('Buscar paciente…').fill('Maria');
    await page.getByRole('option', { name: new RegExp(SEED_PATIENT) }).first().click();

    const professional = page.locator('#appt-professional');
    if (await professional.isVisible().catch(() => false)) {
      const opt = professional.locator('option').nth(1);
      const value = await opt.getAttribute('value');
      if (value) await professional.selectOption(value);
    }

    const agendar = page.getByRole('button', { name: 'Agendar' });
    await expect(agendar).toBeEnabled({ timeout: 10_000 });
    await agendar.click();
    const stillOpen = page.getByRole('dialog').getByText('Novo agendamento', { exact: true });
    try {
      await expect(stillOpen).toBeHidden({ timeout: 20_000 });
    } catch {
      const alertText = (await page.locator('[data-slot="alert"]').allTextContents()).join(' | ');
      throw new Error(`Agendar manteve o diálogo aberto. Alertas: ${alertText || '(nenhum)'}`);
    }

    await expect(page.getByRole('button', { name: new RegExp(SEED_PATIENT) }).first()).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('button', { name: new RegExp(SEED_PATIENT) }).first().click();
    await page.getByRole('button', { name: 'Confirmar presença' }).click();
    await expect(page.getByText('Confirmado').first()).toBeVisible();
  });

  test('Novo agendamento: escolhe data, horário e duração no formulário', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/app/agenda');
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible({ timeout: 45_000 });

    // Dia útil daqui a ~6 semanas, em horário comercial e minuto variável (evita conflito entre execuções).
    const day = new Date();
    day.setDate(day.getDate() + 40 + (Date.now() % 25));
    while (day.getDay() === 0 || day.getDay() === 6) day.setDate(day.getDate() + 1);
    const ymd = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const hour = 9 + (Date.now() % 8);
    const minute = [0, 15, 30, 45][Date.now() % 4]!;
    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    await page.getByRole('button', { name: 'Novo agendamento' }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByText('Novo agendamento', { exact: true })).toBeVisible();

    await page.getByPlaceholder('Buscar paciente…').fill('Maria');
    await page.getByRole('option', { name: new RegExp(SEED_PATIENT) }).first().click();

    await page.locator('#appt-date').fill(ymd);
    await page.locator('#appt-time').fill(time);
    await page.locator('#appt-duration').selectOption('45');
    await expect(page.locator('#appt-date')).toHaveValue(ymd);
    await expect(page.locator('#appt-time')).toHaveValue(time);
    await expect(page.locator('#appt-duration')).toHaveValue('45');

    const professional = page.locator('#appt-professional');
    if (await professional.isVisible().catch(() => false)) {
      const value = await professional.locator('option').nth(1).getAttribute('value');
      if (value) await professional.selectOption(value);
    }

    await page.getByRole('button', { name: 'Agendar', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
  });

  test('abre diálogo de bloqueio', async ({ page }) => {
    await page.goto('/app/agenda');
    await page.getByRole('button', { name: 'Bloquear' }).click();
    await expect(page.getByText('Bloquear horário', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Motivo')).toBeVisible();
  });
});
