import { expect, test, type Page } from '@playwright/test';
import { expect as ownerExpect, test as ownerTest } from './helpers/fixtures';
import { loginAs } from './helpers/auth';
import { ASSISTANT, DENTIST, FINANCE, RECEPTION, SEED_PATIENT } from './helpers/credentials';

async function createDraftQuote(page: Page) {
  await page.goto('/app/orcamentos');
  await ownerExpect(page.getByRole('heading', { name: 'Orçamentos' })).toBeVisible();
  await page.getByRole('button', { name: 'Novo orçamento' }).click();
  await ownerExpect(page.getByRole('heading', { name: 'Novo orçamento' })).toBeVisible();

  await page.getByLabel('Buscar paciente').fill(SEED_PATIENT);
  await ownerExpect(page.locator('#quote-patient option', { hasText: SEED_PATIENT })).toHaveCount(1, {
    timeout: 20_000,
  });
  await page.locator('#quote-patient').selectOption({ label: SEED_PATIENT });
  await page.locator('#quote-professional').selectOption({ label: DENTIST.name });

  const procedureSelect = page.locator('#quote-item-procedure-0');
  const procedureOption = procedureSelect.locator('option', { hasText: 'Restauração em resina — 1 face' });
  await ownerExpect(procedureOption).toHaveCount(1, { timeout: 20_000 });
  const procedureValue = await procedureOption.getAttribute('value');
  await procedureSelect.selectOption(procedureValue ?? '');
  await page.getByLabel('Dente').fill('26');
  await page.getByRole('button', { name: 'Criar' }).click();
  await ownerExpect(page.getByRole('heading', { name: 'Novo orçamento' })).toHaveCount(0);
}

ownerTest.describe('Orçamentos (operacional)', () => {
  ownerTest('lista, cria DRAFT, envia e aprova no link público (6x com entrada)', async ({
    page,
  }) => {
    await createDraftQuote(page);
    await ownerExpect(page.getByRole('cell', { name: SEED_PATIENT }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Enviar' }).first().click();
    await ownerExpect(page.getByRole('heading', { name: 'Enviar orçamento' })).toBeVisible();
    await page.locator('#quote-channel').selectOption('COPY');
    await page.getByRole('dialog').getByRole('button', { name: 'Enviar' }).click();

    const publicUrl = page.locator('#quote-public-url');
    await ownerExpect(publicUrl).toBeVisible({ timeout: 20_000 });
    const url = await publicUrl.inputValue();
    const path = new URL(url).pathname;

    await page.goto(path);
    await ownerExpect(page.getByText(/proposta nº/i)).toBeVisible();
    await page.getByLabel('Parcelas').fill('6');
    await page.getByLabel('Entrada (R$)').fill('20');
    await page.getByRole('button', { name: 'Aprovar' }).click();
    await ownerExpect(page.getByText(/Parcela 1 ·/)).toBeVisible({ timeout: 20_000 });
    await ownerExpect(page.getByText(/Parcela 6 ·/)).toBeVisible();
  });

  ownerTest('ficha tem aba Orçamentos e timeline QUOTE após criar', async ({ page }) => {
    await page.goto('/app/pacientes');
    await page.getByLabel('Buscar pacientes').fill(SEED_PATIENT);
    await page.getByRole('link', { name: /^Abrir paciente/ }).first().click();
    await ownerExpect(page).toHaveURL(/\/app\/pacientes\//);
    await ownerExpect(page.getByRole('tab', { name: 'Orçamentos' })).toBeVisible();
    await page.getByRole('tab', { name: 'Orçamentos' }).click();
    await ownerExpect(page.getByRole('heading', { name: 'Orçamentos' })).toBeVisible();
    await page.getByRole('tab', { name: 'Timeline' }).click();
    await ownerExpect(page.getByText('QUOTE', { exact: true }).first()).toBeVisible();
  });
});

test.describe('Orçamentos (recepção)', () => {
  test('vê nav e aba Orçamentos e não vê Prontuário', async ({ page }) => {
    await loginAs(page, RECEPTION);
    await expect(page.getByRole('link', { name: 'Orçamentos' })).toBeVisible();
    await page.goto('/app/pacientes');
    await page.getByLabel('Buscar pacientes').fill(SEED_PATIENT);
    await page.getByRole('link', { name: /^Abrir paciente/ }).first().click();
    await expect(page).toHaveURL(/\/app\/pacientes\//);
    await expect(page.getByRole('tab', { name: 'Orçamentos' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Prontuário' })).toHaveCount(0);
  });

  test('vê catálogo de procedimentos ao montar orçamento', async ({ page }) => {
    await loginAs(page, RECEPTION);
    await page.goto('/app/orcamentos');
    await page.getByRole('button', { name: 'Novo orçamento' }).click();
    await expect(page.getByRole('heading', { name: 'Novo orçamento' })).toBeVisible();
    const procedureOption = page.locator('#quote-item-procedure-0 option', {
      hasText: 'Restauração em resina — 1 face',
    });
    await expect(procedureOption).toHaveCount(1, { timeout: 20_000 });
  });
});

test.describe('Orçamentos (ASB / financeiro)', () => {
  test('ASB não vê nav Orçamentos', async ({ page }) => {
    await loginAs(page, ASSISTANT);
    await expect(page.getByRole('link', { name: 'Orçamentos' })).toHaveCount(0);
  });

  test('financeiro não vê nav Orçamentos', async ({ page }) => {
    await loginAs(page, FINANCE);
    await expect(page.getByRole('link', { name: 'Orçamentos' })).toHaveCount(0);
  });
});
