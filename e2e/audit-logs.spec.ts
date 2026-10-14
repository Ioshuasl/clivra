import { expect, test } from '@playwright/test';
import { expect as ownerExpect, test as ownerTest } from './helpers/fixtures';
import { loginAs } from './helpers/auth';
import { DENTIST, RECEPTION, SEED_PATIENT } from './helpers/credentials';

ownerTest.describe('Auditoria (owner)', () => {
  ownerTest('filtra a paciente seed e vê leitura clínica', async ({ page }) => {
    await page.goto('/app/pacientes');
    await page.getByLabel('Buscar pacientes').fill(SEED_PATIENT);
    await page.getByRole('link', { name: /^Abrir paciente/ }).first().click();
    await ownerExpect(page).toHaveURL(/\/app\/pacientes\//);
    await ownerExpect(page.getByRole('heading', { name: SEED_PATIENT })).toBeVisible();

    await page.getByRole('tab', { name: 'Prontuário' }).click();
    await ownerExpect(page.getByRole('heading', { name: 'Prontuário' })).toBeVisible();

    await page.getByRole('link', { name: 'Ver acessos' }).click();
    await ownerExpect(page).toHaveURL(/\/app\/configuracoes\/auditoria\?patientId=/);
    await ownerExpect(page.getByRole('heading', { name: 'Auditoria' })).toBeVisible();
    await ownerExpect(page.getByRole('link', { name: 'Auditoria' })).toBeVisible();
    await ownerExpect(page.getByText('Leitura clínica').first()).toBeVisible();

    await page.getByLabel('Ação').selectOption('CLINICAL_READ');
    await ownerExpect(page.getByText('Leitura clínica').first()).toBeVisible();
  });
});

test.describe('Auditoria (papéis sem permissão)', () => {
  test('recepção não vê nav e recebe 403', async ({ page }) => {
    await loginAs(page, RECEPTION);
    await expect(page.getByRole('link', { name: 'Auditoria' })).toHaveCount(0);

    await page.goto('/app/auditoria');
    await expect(
      page.getByText('Você não tem permissão para consultar a trilha de auditoria.'),
    ).toBeVisible();
  });

  test('dentista não vê Auditoria na navegação', async ({ page }) => {
    await loginAs(page, DENTIST);
    await expect(page.getByRole('link', { name: 'Auditoria' })).toHaveCount(0);
  });
});
