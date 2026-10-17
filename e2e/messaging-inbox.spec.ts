import { expect, test } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { RECEPTION, SEED_PATIENT } from './helpers/credentials';
import { ensureInboxSeedConversation } from './helpers/messaging-inbox';

test.describe('Messaging Inbox (E8b)', () => {
  test('recepção abre inbox, lê conversa seed e responde (fake, sem Meta)', async ({ page }) => {
    const seed = await ensureInboxSeedConversation();

    await loginAs(page, RECEPTION);

    await expect(page.getByRole('link', { name: /^WhatsApp/ })).toBeVisible();
    await page.goto('/app/inbox');
    await expect(page.getByRole('heading', { name: 'WhatsApp', level: 1 })).toBeVisible();

    const list = page.getByRole('list', { name: 'Lista de conversas' });
    await expect(list).toBeVisible({ timeout: 20_000 });

    const row = list
      .getByRole('button')
      .filter({ hasText: new RegExp(`${SEED_PATIENT}|${seed.contactPhone.slice(-4)}`) })
      .first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.click();

    await expect(page.getByRole('list', { name: 'Mensagens da conversa' })).toBeVisible({
      timeout: 20_000,
    });
    // Inbound do webhook (preferido) ou mensagem de teste da conta (fallback).
    await expect(
      page
        .getByText(/preciso remarcar \(e2e inbox\)|Conexão WhatsApp da clínica confirmada/i)
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    const reply = `Resposta e2e inbox ${Date.now()}`;
    await page.getByPlaceholder('Escreva uma mensagem…').fill(reply);
    await page.getByRole('button', { name: 'Enviar mensagem' }).click();
    await expect(page.getByText(reply)).toBeVisible({ timeout: 20_000 });

    // Painel do paciente: ficha se vinculado; senão pelo menos o telefone do contato.
    const patientPanel = page.getByRole('heading', { name: 'Paciente' });
    if (await patientPanel.isVisible().catch(() => false)) {
      await expect(page.getByText(seed.contactPhone).first()).toBeVisible();
    }
  });

  test('rota WhatsApp de conta permanece intacta', async ({ page }) => {
    await loginAs(page, RECEPTION);
    await page.goto('/app/whatsapp');
    await expect(page.getByRole('heading', { name: 'WhatsApp' })).toBeVisible();
  });
});
