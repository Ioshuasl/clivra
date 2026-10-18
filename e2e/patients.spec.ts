import { expect, test } from './helpers/fixtures';
import { SEED_PATIENT } from './helpers/credentials';

test.describe('Patients (E3)', () => {

  test('lista e busca pacientes seed', async ({ page }) => {
    await page.goto('/app/pacientes');
    await expect(page.getByRole('heading', { name: 'Pacientes' })).toBeVisible();
    await expect(page.getByText(SEED_PATIENT)).toBeVisible();

    await page.getByLabel('Buscar pacientes').fill('Maria');
    await expect(page.getByText(SEED_PATIENT)).toBeVisible();
    await page.getByLabel('Buscar pacientes').fill('zzz-nao-existe');
    await expect(page.getByText('Nenhum paciente encontrado')).toBeVisible();
  });

  test('abre ficha com timeline', async ({ page }) => {
    await page.goto('/app/pacientes');
    await page.getByLabel('Buscar pacientes').fill(SEED_PATIENT);
    await page.getByRole('link', { name: /^Abrir paciente/ }).first().click();
    await expect(page).toHaveURL(/\/app\/pacientes\//);
    await expect(page.getByRole('heading', { name: SEED_PATIENT })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Dados' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Responsáveis' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Consentimentos' })).toBeVisible();
    await page.getByRole('tab', { name: 'Timeline' }).click();
    await expect(page.getByRole('tab', { name: 'Timeline' })).toBeVisible();
  });

  test('cria paciente e abre a ficha', async ({ page }) => {
    const stamp = Date.now();
    const name = `Paciente E2E ${stamp}`;
    const phone = `6299${String(stamp).slice(-7)}`;

    await page.goto('/app/pacientes');
    await page.getByRole('button', { name: 'Novo paciente' }).click();
    await expect(page.getByRole('dialog').getByText('Novo paciente', { exact: true })).toBeVisible();
    await page.getByLabel('Nome completo').fill(name);
    await page.getByLabel('Telefone', { exact: true }).fill(phone);
    await page.getByRole('button', { name: 'Criar paciente' }).click();

    await expect(page).toHaveURL(/\/app\/pacientes\//, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await expect(page.getByText(/Ficha #/)).toBeVisible();
  });

  test('sem internet: avisa com clareza e o botão volta ao normal', async ({ page }) => {
    await page.goto('/app/pacientes');
    await page.getByRole('button', { name: 'Novo paciente' }).click();
    await page.getByLabel('Nome completo').fill(`Offline ${Date.now()}`);
    await page.getByLabel('Telefone', { exact: true }).fill(`6295${String(Date.now()).slice(-7)}`);

    await page.context().setOffline(true);
    try {
      await page.getByRole('button', { name: 'Criar paciente' }).click();
      await expect(page.getByText(/Sem conexão com o servidor/)).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('button', { name: 'Criar paciente' })).toBeEnabled();
    } finally {
      await page.context().setOffline(false);
    }
  });
});
