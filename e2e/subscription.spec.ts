import { expect, test } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { ASSISTANT, DENTIST, OWNER } from './helpers/credentials';
import {
  ensureSubscriptionActive,
  setSubscriptionStatus,
} from './helpers/subscription';

test.describe('Assinatura (E10)', () => {
  test.afterEach(async () => {
    await ensureSubscriptionActive();
  });

  test('owner vê /assinatura com plano e uso', async ({ page }) => {
    await ensureSubscriptionActive();
    await loginAs(page, OWNER);

    // O item "Assinatura" fica dentro do grupo Configurações (expandido na própria rota).
    await page.goto('/app/assinatura');
    await expect(page.getByRole('link', { name: 'Assinatura' })).toBeVisible();
    await expect(page.getByTestId('subscription-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Assinatura' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Uso atual' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Faturas' })).toBeVisible();
  });

  test('ASB e DENTIST não veem nav Assinatura', async ({ page }) => {
    test.setTimeout(180_000);
    await loginAs(page, ASSISTANT);
    await expect(page.getByRole('link', { name: 'Assinatura' })).toHaveCount(0);
    await page.goto('/app/assinatura');
    await expect(page.getByText(/Apenas o dono da clínica/i)).toBeVisible();

    await loginAs(page, DENTIST);
    await expect(page.getByRole('link', { name: 'Assinatura' })).toHaveCount(0);
  });

  test('SUSPENDED mostra somente leitura para owner', async ({ page }) => {
    await setSubscriptionStatus('SUSPENDED', 'e2e subscription: force SUSPENDED');
    await loginAs(page, OWNER);

    await expect(page.getByTestId('subscription-banner-readonly')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/somente leitura/i).first()).toBeVisible();

    await page.goto('/app/assinatura');
    await expect(page.getByTestId('subscription-readonly-alert')).toBeVisible({
      timeout: 20_000,
    });
  });
});
