import { expect, test } from './helpers/fixtures';
import { ensureSubscriptionActive } from './helpers/subscription';

test.describe('Messaging WhatsApp (E8a ops)', () => {
  test.beforeEach(async () => {
    await ensureSubscriptionActive();
  });

  test('primeiros passos aponta para a rota WhatsApp', async ({ page }) => {
    await page.goto('/app/primeiros-passos');
    await expect(page.getByRole('heading', { name: 'Primeiros passos', level: 1 })).toBeVisible();
    await expect(page.locator('a[href="/app/configuracoes/whatsapp"]').first()).toBeVisible();
  });

  test('wizard conecta conta fake e mostra uso/logs', async ({ page }) => {
    await page.goto('/app/whatsapp');
    await expect(page.getByRole('heading', { name: 'WhatsApp' })).toBeVisible({ timeout: 45_000 });

    const connected = page.getByText('Conectado');
    if (!(await connected.isVisible().catch(() => false))) {
      const connectButton = page.getByRole('button', { name: 'Conectar' });
      await expect(connectButton).toBeVisible({ timeout: 20_000 });
      const terms = page.getByRole('checkbox').first();
      await terms.check();
      await connectButton.click();
    }

    const testTo = page.getByLabel('Número que receberá o teste');
    if (await testTo.isVisible().catch(() => false)) {
      await testTo.fill('5562999999999');
    }

    const testButton = page.getByRole('button', { name: 'Enviar teste' });
    if (await testButton.isVisible().catch(() => false)) {
      await testButton.click();
    }

    await expect(connected).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel('Kill switch')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Uso' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Logs de envio' })).toBeVisible();
  });
});
