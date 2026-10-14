import { expect, test } from '@playwright/test';
import { expectLoginPage, loginAs, signupClinic } from './helpers/auth';
import { OWNER, RECEPTION } from './helpers/credentials';

test.describe('Identity (E1)', () => {
  test('login com credenciais inválidas mostra erro', async ({ page }) => {
    await page.goto('/login');
    await expectLoginPage(page);
    await page.getByLabel('E-mail').fill('nao-existe@example.com');
    await page.getByLabel('Senha', { exact: true }).fill('senha-errada');
    await page.getByRole('button', { name: 'Entrar' }).click();
    // Evita o announcer do Next (`#__next-route-announcer__` também é role=alert).
    await expect(page.locator('[data-slot="alert"]')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('owner entra e vê o dashboard', async ({ page }) => {
    await loginAs(page, OWNER);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/(Bom dia|Boa tarde|Boa noite), Dr\. Owner/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Menu do usuário' })).toContainText(OWNER.name);
  });

  test('recepção entra', async ({ page }) => {
    test.setTimeout(180_000);
    await loginAs(page, RECEPTION);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/\/app/);
  });

  test('signup cria clínica e entra no app', async ({ page }) => {
    await signupClinic(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/(Bom dia|Boa tarde|Boa noite), /)).toBeVisible();
  });

  test('forgot password não enumera e-mail', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/forgot-password');
    await expect(page.getByText('Recuperar senha', { exact: true })).toBeVisible();
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await page.getByLabel('E-mail').fill('qualquer@example.com');
      await page.getByRole('button', { name: 'Enviar link' }).click();
      const success = page.getByText(/Se o e-mail estiver cadastrado, você receberá instruções/i);
      if (await success.isVisible().catch(() => false)) {
        await expect(success).toBeVisible();
        return;
      }
      const rateLimited = await page
        .getByText(/Muitas tentativas/i)
        .first()
        .isVisible()
        .catch(() => false);
      if (rateLimited && attempt < 6) {
        await page.waitForTimeout(65_000);
        continue;
      }
      await expect(success).toBeVisible({ timeout: 30_000 });
      return;
    }
  });

  test('rota autenticada redireciona para login', async ({ page }) => {
    await page.goto('/app/agenda');
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
    await expectLoginPage(page);
  });
});
