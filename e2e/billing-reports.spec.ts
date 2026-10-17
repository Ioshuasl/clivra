import { expect, test } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { ensureOpenInstallmentForMaria, registerPaymentPixCash } from './helpers/billing';
import { FINANCE, OWNER, RECEPTION } from './helpers/credentials';

test.describe('Relatórios financeiros', () => {
  test('baixa PIX+CASH do dia entra nos relatórios financeiros (owner)', async ({ page }) => {
    const seed = await ensureOpenInstallmentForMaria();
    const paid = await registerPaymentPixCash(seed.installmentId, seed.balanceCents);
    expect(paid.amountCents).toBeGreaterThan(0);

    await loginAs(page, OWNER);
    await page.goto('/app/financeiro');
    await page.locator('main a[href="/app/financeiro/relatorios"]').click();
    await expect(page).toHaveURL(/\/app\/financeiro\/relatorios/);
    await expect(
      page.getByRole('heading', { name: 'Relatórios financeiros', level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fluxo do mês' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('heading', { name: 'Produção por dentista' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Resumo financeiro' })).toBeVisible();
  });

  test('FINANCE acessa os relatórios; recepção recebe aviso de permissão', async ({ page }) => {
    await loginAs(page, FINANCE);
    await page.goto('/app/financeiro/relatorios');
    await expect(
      page.getByRole('heading', { name: 'Relatórios financeiros', level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fluxo do mês' })).toBeVisible({
      timeout: 20_000,
    });

    await loginAs(page, RECEPTION);
    await page.goto('/app/financeiro/relatorios');
    await expect(
      page.getByRole('heading', { name: 'Relatórios financeiros', level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: /permiss/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});
