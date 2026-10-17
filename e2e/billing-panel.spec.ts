import { expect, test } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { FINANCE } from './helpers/credentials';
import { expect as ownerExpect, test as ownerTest } from './helpers/fixtures';

ownerTest.describe('Painel financeiro — pagar (owner)', () => {
  ownerTest(
    'cria uma conta a pagar pelo painel, ela aparece como saída e é paga',
    async ({ page }) => {
      await page.goto('/app/financeiro');
      await ownerExpect(
        page.getByRole('heading', { name: 'Hoje na clínica', level: 1 }),
      ).toBeVisible();

      await page.getByRole('button', { name: 'Registrar movimentação' }).click();
      const drawer = page.getByRole('dialog');
      await ownerExpect(drawer.getByText('Registrar movimentação', { exact: true })).toBeVisible();
      await drawer.getByRole('button', { name: 'Saída (pagar)' }).click();
      await drawer.getByRole('button', { name: 'Nova conta a pagar' }).click();

      await ownerExpect(page.getByRole('dialog').getByText('Nova conta a pagar')).toBeVisible();
      const category = page.locator('#payable-category');
      await ownerExpect(category.locator('option').nth(1)).toBeAttached({ timeout: 20_000 });
      const firstValue = await category.locator('option').nth(1).getAttribute('value');
      await category.selectOption(firstValue ?? '');
      const description = `Aluguel e2e ${Date.now()}`;
      await page.locator('#payable-desc').fill(description);
      await page.locator('#payable-amount').fill('1200,00');
      const due = new Date();
      due.setDate(due.getDate() + 3);
      await page.locator('#payable-due').fill(due.toISOString().slice(0, 10));
      await page.getByRole('button', { name: 'Salvar' }).click();

      // A conta nova entra em "Movimentações" como saída em aberto.
      const row = page.getByRole('listitem').filter({ hasText: description });
      await ownerExpect(row.first()).toBeVisible({ timeout: 20_000 });
      await ownerExpect(row.filter({ hasText: 'Saída' }).first()).toBeVisible();

      await row.filter({ hasText: 'Saída' }).first().getByRole('button', { name: 'Pagar' }).click();
      await ownerExpect(page.getByRole('dialog').getByText('Pagar conta')).toBeVisible();
      await page.locator('#payable-pay-method').selectOption('PIX');
      await page.getByRole('button', { name: 'Confirmar pagamento' }).click();
      await ownerExpect(page.getByRole('listitem').filter({ hasText: description })).toHaveCount(
        0,
        { timeout: 20_000 },
      );
    },
  );
});

test.describe('Painel financeiro — filtros', () => {
  test('FINANCE alterna entre Todas, Entradas e Saídas', async ({ page }) => {
    await loginAs(page, FINANCE);
    await page.goto('/app/financeiro');
    await expect(page.getByRole('heading', { name: 'Movimentações' })).toBeVisible();

    await page.getByRole('button', { name: 'Saídas', exact: true }).click();
    await expect(page.getByRole('listitem').filter({ hasText: 'Entrada' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Entradas', exact: true }).click();
    await expect(page.getByRole('listitem').filter({ hasText: /^Saída/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'Todas', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Movimentações' })).toBeVisible();
  });
});
