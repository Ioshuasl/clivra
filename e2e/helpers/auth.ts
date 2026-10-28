import { expect, type Page } from '@playwright/test';
import { OWNER, type E2eUser } from './credentials';

export async function expectLoginPage(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  await expect(page.getByLabel(/E-mail/i)).toBeVisible();
}

export async function loginAs(page: Page, user: E2eUser): Promise<void> {
  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await page.goto('/login');
    await expectLoginPage(page);
    await page.getByLabel(/E-mail/i).fill(user.email);
    await page.getByLabel('Senha', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'Entrar' }).click();

    try {
      await expect(page).toHaveURL(/\/app(\/|$|\?)/, { timeout: 25_000 });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
      return;
    } catch (error) {
      const rateLimited = await page
        .getByText(/Muitas tentativas/i)
        .first()
        .isVisible()
        .catch(() => false);
      if (rateLimited && attempt < maxAttempts) {
        await page.waitForTimeout(65_000);
        continue;
      }
      // "Entrando…" travado / rede lenta — tenta de novo antes de falhar.
      const stillSubmitting = await page
        .getByRole('button', { name: /Entrando/i })
        .isVisible()
        .catch(() => false);
      if (stillSubmitting && attempt < maxAttempts) {
        await page.waitForTimeout(16_000);
        continue;
      }
      throw error;
    }
  }
}

export async function signupClinic(
  page: Page,
  input?: { email?: string; clinicName?: string; ownerName?: string },
): Promise<{ email: string; clinicName: string }> {
  const stamp = Date.now();
  const email = input?.email ?? `e2e-${stamp}@example.com`;
  const clinicName = input?.clinicName ?? `Clínica E2E ${stamp}`;
  const ownerName = input?.ownerName ?? `Owner E2E ${stamp}`;

  await page.goto('/signup');
  await expect(page.getByText('Criar clínica', { exact: true })).toBeVisible();
  await page.getByLabel('Nome da clínica').fill(clinicName);
  await page.getByLabel('Seu nome').fill(ownerName);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(OWNER.password);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/app(\/|$|\?)/, { timeout: 60_000 });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });

  return { email, clinicName };
}

/** Abre a tela de Configurações (lateral com as seções) a partir de qualquer página do app. */
export async function openSettingsNav(page: Page): Promise<void> {
  if (page.url().includes('/app/configuracoes')) return;
  await page.getByRole('link', { name: 'Configurações', exact: true }).first().click();
  await page.waitForURL(/\/app\/configuracoes\//);
}
