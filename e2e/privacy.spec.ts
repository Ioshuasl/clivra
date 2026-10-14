import { expect, test } from '@playwright/test';
import { expect as ownerExpect, test as ownerTest } from './helpers/fixtures';
import { loginAs, openSettingsNav } from './helpers/auth';
import { DENTIST, RECEPTION, SEED_PATIENT } from './helpers/credentials';

ownerTest.describe('Privacidade (owner)', () => {
  ownerTest('exporta a clínica e registra DSR de acesso', async ({ page }) => {
    await page.goto('/app');
    await openSettingsNav(page);
    await ownerExpect(page.getByRole('link', { name: 'Privacidade' })).toBeVisible();

    await page.goto('/app/configuracoes/privacidade');
    await ownerExpect(page.getByRole('heading', { name: 'Privacidade' })).toBeVisible();
    await ownerExpect(
      page.getByText('O arquivo contém dados de pacientes. Trate-o como confidencial.'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Exportar dados da clínica' }).click();
    await ownerExpect(page.getByRole('button', { name: 'Baixar ZIP' })).toBeVisible({
      timeout: 60_000,
    });
    await ownerExpect(page.getByRole('button', { name: 'Copiar URL' })).toBeVisible();

    await page.getByRole('button', { name: 'Nova solicitação' }).click();
    await ownerExpect(page.getByRole('heading', { name: 'Nova solicitação do titular' })).toBeVisible();
    await page.getByLabel('Filtrar paciente').fill(SEED_PATIENT);
    await ownerExpect(page.getByLabel('Paciente', { exact: true }).locator('option', { hasText: SEED_PATIENT })).toBeAttached({
      timeout: 15_000,
    });
    const patientValue = await page
      .getByLabel('Paciente', { exact: true })
      .locator('option', { hasText: SEED_PATIENT })
      .first()
      .getAttribute('value');
    await page.getByLabel('Paciente', { exact: true }).selectOption(patientValue ?? '');
    await page.getByLabel('Tipo', { exact: true }).selectOption('ACCESS');
    await page.getByRole('button', { name: 'Registrar' }).click();
    await ownerExpect(page.getByText('Baixar pacote')).toBeVisible({
      timeout: 60_000,
    });
  });
});

test.describe('Privacidade (papéis sem permissão)', () => {
  test('recepção não vê nav e recebe 403', async ({ page }) => {
    await loginAs(page, RECEPTION);
    await openSettingsNav(page);
    await expect(page.getByRole('link', { name: 'Privacidade' })).toHaveCount(0);

    await page.goto('/app/configuracoes/privacidade');
    await expect(
      page.getByText('Você não tem permissão para gerenciar privacidade e exportação de dados.'),
    ).toBeVisible();
  });

  test('dentista não vê Privacidade na navegação', async ({ page }) => {
    await loginAs(page, DENTIST);
    await openSettingsNav(page);
    await expect(page.getByRole('link', { name: 'Privacidade' })).toHaveCount(0);
  });
});
