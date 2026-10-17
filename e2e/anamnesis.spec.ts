import { expect, test, type Page } from '@playwright/test';
import { expect as ownerExpect, test as ownerTest } from './helpers/fixtures';
import { loginAs } from './helpers/auth';
import { RECEPTION, SEED_PATIENT } from './helpers/credentials';

async function openSeedPatient(page: Page) {
  await page.goto('/app/pacientes');
  await page.getByLabel('Buscar pacientes').fill(SEED_PATIENT);
  await page.getByRole('link', { name: /^Abrir paciente/ }).first().click();
  await ownerExpect(page).toHaveURL(/\/app\/pacientes\//);
  await ownerExpect(page.getByRole('heading', { name: SEED_PATIENT })).toBeVisible();
}

test.describe('Anamnese pública', () => {
  test('token inválido mostra 404', async ({ page }) => {
    await page.goto('/anamnese/token-invalido');
    await expect(page.getByText('Link inválido, expirado ou já utilizado.')).toBeVisible();
  });
});

ownerTest.describe('Anamnese (ficha + público)', () => {
  ownerTest('owner envia link, paciente responde e histórico aparece', async ({ page }) => {
    await openSeedPatient(page);
    await page.getByRole('tab', { name: 'Prontuário' }).click();
    await ownerExpect(page.getByText('Prontuário clínico')).toBeVisible();

    await page.getByRole('button', { name: 'Enviar anamnese' }).click();
    await ownerExpect(page.getByRole('heading', { name: 'Enviar anamnese' })).toBeVisible();
    await page.locator('#anamnesis-channel').selectOption('COPY');
    await page.getByRole('button', { name: 'Enviar' }).click();

    const publicUrl = page.locator('#anamnesis-public-url');
    await ownerExpect(publicUrl).toBeVisible({ timeout: 20_000 });
    const url = await publicUrl.inputValue();
    const path = new URL(url).pathname;
    await page.getByRole('button', { name: 'Fechar' }).click();

    await page.goto(path);
    await ownerExpect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await ownerExpect(page.getByText(/responda as perguntas/i)).toBeVisible();

    await page.getByLabel(/Possui alergia a medicamentos/i).selectOption('true');
    const allergyExtra = page.getByPlaceholder('Qual? (opcional)');
    if (await allergyExtra.isVisible().catch(() => false)) {
      await allergyExtra.fill('Dipirona');
    }
    await page.getByLabel(/Queixa principal/i).fill('Dor no dente 26');
    await page.getByRole('button', { name: 'Enviar anamnese' }).click();
    await ownerExpect(page.getByText('Anamnese enviada. Obrigado!')).toBeVisible({ timeout: 20_000 });

    await openSeedPatient(page);
    await page.getByRole('tab', { name: 'Prontuário' }).click();
    // Histórico acumula respostas de runs anteriores — aceita o mais recente.
    await ownerExpect(page.getByText('Queixa principal').first()).toBeVisible();
    await ownerExpect(page.getByText('Dor no dente 26').first()).toBeVisible();
  });

  ownerTest('admin lista Anamnese Geral v1', async ({ page }) => {
    await page.goto('/app/configuracoes/anamnese');
    await ownerExpect(page.getByRole('heading', { name: 'Anamnese' })).toBeVisible();
    await ownerExpect(page.getByText('Anamnese Geral')).toBeVisible();
    await ownerExpect(page.getByText('v1')).toBeVisible();
    await page.getByRole('button', { name: 'Nova versão' }).click();
    await ownerExpect(page.getByRole('heading', { name: 'Nova versão da anamnese' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
  });
});

test.describe('Anamnese (recepção)', () => {
  test('recepção não vê a aba Prontuário', async ({ page }) => {
    await loginAs(page, RECEPTION);
    await page.goto('/app/pacientes');
    await page.getByLabel('Buscar pacientes').fill(SEED_PATIENT);
    await page.getByRole('link', { name: /^Abrir paciente/ }).first().click();
    await expect(page).toHaveURL(/\/app\/pacientes\//);
    await expect(page.getByRole('heading', { name: SEED_PATIENT })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Dados' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Prontuário' })).toHaveCount(0);
  });
});
