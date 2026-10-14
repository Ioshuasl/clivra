import { expect, test } from './helpers/fixtures';
import { SEED_PATIENT } from './helpers/credentials';

test.describe('Waitlist (E4b ops)', () => {
  test('adiciona e remove entrada na fila da agenda', async ({ page }) => {
    await page.goto('/app/agenda');
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible({ timeout: 45_000 });
    await page.getByRole('button', { name: 'Fila de espera' }).click();
    await expect(page.getByRole('button', { name: 'Adicionar', exact: true })).toBeVisible();

    while ((await page.getByRole('button', { name: 'Remover' }).count()) > 0) {
      await page.getByRole('button', { name: 'Remover' }).first().click();
      await page.waitForTimeout(400);
    }

    await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Adicionar à fila' })).toBeVisible();

    await page.getByPlaceholder('Buscar paciente…').fill('Maria');
    await page.getByRole('option', { name: new RegExp(SEED_PATIENT) }).first().click();

    const procedureValue = await page
      .locator('#waitlist-procedure option')
      .filter({ hasText: /Consulta/ })
      .first()
      .getAttribute('value');
    await page.locator('#waitlist-procedure').selectOption(procedureValue ?? '');
    await page.getByRole('button', { name: 'Adicionar à fila' }).click();

    const row = page.locator('li').filter({ hasText: SEED_PATIENT });
    await expect(row.first()).toBeVisible({ timeout: 20_000 });
    await row.first().getByRole('button', { name: 'Remover' }).click();
    await expect(row).toHaveCount(0, { timeout: 20_000 });
  });
});
