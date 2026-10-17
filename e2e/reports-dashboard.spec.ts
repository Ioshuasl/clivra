import { expect, test } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { DENTIST, OWNER } from './helpers/credentials';
import { ensureSubscriptionActive } from './helpers/subscription';

test.describe('Dashboard + relatórios (E9)', () => {
  test.beforeEach(async () => {
    await ensureSubscriptionActive();
  });

  test('owner vê KPIs no início e exporta CSV pelo relatório de receita', async ({ page }) => {
    await loginAs(page, OWNER);

    await page.goto('/app');
    await expect(page.getByTestId('dashboard-kpi-grid')).toBeVisible({ timeout: 30_000 });
    const kpis = page.getByTestId('dashboard-kpi-grid');
    await expect(kpis.getByText('Agenda de hoje')).toBeVisible();
    await expect(kpis.getByText('Recebido hoje')).toBeVisible();
    await expect(kpis.getByText('Produção do mês')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Atendimentos de hoje' })).toBeVisible();

    await expect(page.getByRole('link', { name: 'Relatórios' })).toBeVisible();
    await page.goto('/app/relatorios');
    await expect(page.getByRole('heading', { name: 'Relatórios', level: 1 })).toBeVisible();

    // O export fica dentro de cada relatório (aqui, receita).
    await page.locator('a[href="/app/relatorios/receita"]').first().click();
    await expect(page).toHaveURL(/\/app\/relatorios\/receita/);
    await page.getByRole('button', { name: 'Exportar CSV' }).click();
    await expect(page.getByTestId('report-export-panel')).toBeVisible();

    await page.getByTestId('report-export-panel').getByRole('button', { name: 'Gerar arquivo' }).click();
    await expect(page.getByText(/Status:/i)).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/Na fila|Gerando…|Pronto|Baixar CSV|Aguardando/i).first(),
    ).toBeVisible({ timeout: 60_000 });
  });

  test('drill-down de faltas abre página de relatório', async ({ page }) => {
    await loginAs(page, OWNER);
    await page.goto('/app');
    await expect(page.getByTestId('dashboard-kpi-grid')).toBeVisible({ timeout: 30_000 });
    const drill = page.getByTestId('dashboard-kpi-grid').getByRole('link', { name: /Faltas no mês/ });
    await expect(drill).toBeVisible();
    // URL real: /app/relatorios/faltas?from=…&to=… (sem trailing slash).
    await Promise.all([
      page.waitForURL(/\/app\/relatorios\/faltas(\?|$)/, { timeout: 30_000 }),
      drill.click(),
    ]);
    await expect(page.getByRole('heading', { name: 'Faltas', level: 1 })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('dentista vê dashboard sem recebimentos do dia; acessa produção', async ({ page }) => {
    await loginAs(page, DENTIST);
    await page.goto('/app');
    const kpis = page.getByTestId('dashboard-kpi-grid');
    await expect(kpis).toBeVisible({ timeout: 30_000 });
    await expect(kpis.getByText('Agenda de hoje')).toBeVisible();
    await expect(kpis.getByText('Recebido hoje')).toHaveCount(0);
    await expect(kpis.getByText('A receber hoje')).toHaveCount(0);
    await expect(kpis.getByText('Produção do mês')).toBeVisible();

    await page.goto('/app/relatorios');
    await expect(page.getByRole('heading', { name: 'Relatórios', level: 1 })).toBeVisible();
    await expect(page.locator('a[href="/app/relatorios/producao"]').first()).toBeVisible();
    await expect(page.locator('a[href="/app/relatorios/receita"]')).toHaveCount(0);
  });
});
