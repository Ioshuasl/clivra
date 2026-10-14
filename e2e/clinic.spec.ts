import { setChairsEnabled } from './helpers/clinic';
import { expect, test } from './helpers/fixtures';
import { DENTIST, SEED_CHAIR, SEED_CLINIC } from './helpers/credentials';

test.describe('Clinic (E2)', () => {

  test('perfil da clínica', async ({ page }) => {
    await page.goto('/app/configuracoes/clinica');
    await expect(page.getByRole('heading', { name: 'Clínica', level: 1 })).toBeVisible();
    await expect(page.locator('#name')).toHaveValue(SEED_CLINIC);
  });

  test('horários semanais', async ({ page }) => {
    await page.goto('/app/configuracoes/horarios');
    await expect(page.getByRole('heading', { name: 'Horários semanais' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Adicionar slot' })).toBeVisible();
  });

  test('cadeiras: desligadas redirecionam; ligadas listam seed e criam nova', async ({ page }) => {
    await setChairsEnabled(false);
    await page.goto('/app/configuracoes/cadeiras');
    await expect(page).toHaveURL(/\/app\/configuracoes\/clinica/, { timeout: 30_000 });

    await setChairsEnabled(true);
    try {
      await page.goto('/app/configuracoes/cadeiras');
      await expect(page.getByRole('heading', { name: 'Cadeiras' })).toBeVisible();
      await expect(page.getByRole('cell', { name: SEED_CHAIR })).toBeVisible();

      const name = `Cadeira E2E ${Date.now()}`;
      await page.getByRole('button', { name: 'Nova cadeira' }).click();
      await expect(page.getByRole('dialog').getByText('Nova cadeira', { exact: true })).toBeVisible();
      await page.locator('#chair-name').fill(name);
      await page.getByRole('button', { name: 'Criar' }).click();
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    } finally {
      await setChairsEnabled(false);
    }
  });

  test('profissionais', async ({ page }) => {
    await page.goto('/app/configuracoes/profissionais');
    await expect(page.getByRole('heading', { name: 'Profissionais' })).toBeVisible();
    await expect(page.getByText(DENTIST.name)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Novo profissional' })).toBeVisible();
  });

  test('procedimentos', async ({ page }) => {
    await page.goto('/app/configuracoes/procedimentos');
    await expect(page.getByRole('heading', { name: 'Procedimentos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Importar catálogo' })).toBeVisible();
  });

  test('membros e convite', async ({ page }) => {
    await page.goto('/app/configuracoes/membros');
    await expect(page.getByRole('heading', { name: 'Membros', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Convidar' })).toBeVisible();
    await expect(page.getByText(DENTIST.name)).toBeVisible();
  });

  test('onboarding (rota antiga redireciona para Primeiros passos)', async ({ page }) => {
    await page.goto('/app/onboarding');
    await expect(page).toHaveURL(/\/app\/primeiros-passos/);
    await expect(page.getByRole('heading', { name: 'Primeiros passos', level: 1 })).toBeVisible();
  });
});
