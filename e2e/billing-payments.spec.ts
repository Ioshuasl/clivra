import { expect, test } from '@playwright/test';
import { loginAs } from './helpers/auth';
import {
  ensureCashSessionOpen,
  ensureOpenInstallmentForMaria,
} from './helpers/billing';
import { ASSISTANT, DENTIST, FINANCE, RECEPTION, SEED_PATIENT } from './helpers/credentials';

test.describe('Contas a receber (recepção)', () => {
  test('baixa PIX+CASH da Maria, recibo visível e COPY sem Meta', async ({ page }) => {
    // COPY exige PDF gerado pelo worker — pode levar >90s sob carga.
    test.setTimeout(180_000);
    const seed = await ensureOpenInstallmentForMaria();
    await ensureCashSessionOpen(seed.unitId);

    await loginAs(page, RECEPTION);
    await expect(page.locator('a[href="/app/financeiro/receber"]')).toBeVisible();
    await page.goto('/app/financeiro/receber');
    await expect(page.getByRole('heading', { name: 'Contas a receber' })).toBeVisible();

    await page.getByLabel('Filtrar paciente').fill(SEED_PATIENT);
    const patientFilter = page.getByLabel('Paciente do filtro');
    await expect(patientFilter).toBeVisible({ timeout: 20_000 });
    const patientOption = patientFilter.locator('option').filter({ hasText: SEED_PATIENT });
    await expect(patientOption).toHaveCount(1, { timeout: 20_000 });
    const patientValue = await patientOption.getAttribute('value');
    expect(patientValue).toBeTruthy();
    await patientFilter.selectOption(patientValue!);

    const mariaRow = page.getByRole('row').filter({ hasText: SEED_PATIENT });
    await expect(mariaRow.getByRole('button', { name: 'Baixar' }).first()).toBeVisible({
      timeout: 20_000,
    });
    await mariaRow.getByRole('button', { name: 'Baixar' }).first().click();
    await expect(page.getByRole('heading', { name: 'Baixa de parcela' })).toBeVisible();

    const halfReais = (Math.floor(seed.balanceCents / 2) / 100).toFixed(2).replace('.', ',');
    const restCents = seed.balanceCents - Math.floor(seed.balanceCents / 2);
    const restReais = (restCents / 100).toFixed(2).replace('.', ',');

    await page.locator('#payment-method-0').selectOption('PIX');
    await page.locator('#payment-amount-0').fill(halfReais);
    await page.getByRole('button', { name: '+ Forma de pagamento' }).click();
    await page.locator('#payment-method-1').selectOption('CASH');
    await page.locator('#payment-amount-1').fill(restReais);

    await page.getByRole('button', { name: 'Confirmar baixa' }).click();
    await expect(page.getByText(/Recibo nº/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/não é nota fiscal/i)).toBeVisible();

    await expect(async () => {
      await page.getByRole('button', { name: 'Enviar (COPY)' }).click();
      await expect(page.locator('#receipt-copy-text')).toBeVisible({ timeout: 10_000 });
    }).toPass({ timeout: 150_000 });
    await expect(page.getByLabel('Texto para colar')).toBeVisible();
  });
});

test.describe('Financeiro (papéis)', () => {
  test('FINANCE vê nav Receber/Caixa/Pagar', async ({ page }) => {
    await loginAs(page, FINANCE);
    await expect(page.locator('a[href="/app/financeiro/receber"]')).toBeVisible();
    await expect(page.locator('a[href="/app/financeiro/caixa"]')).toBeVisible();
    await expect(page.locator('a[href="/app/financeiro/pagar"]')).toBeVisible();
  });

  test('DENTIST não vê nav Receber/Caixa/Pagar', async ({ page }) => {
    await loginAs(page, DENTIST);
    await expect(page.locator('a[href="/app/financeiro/receber"]')).toHaveCount(0);
    await expect(page.locator('a[href="/app/financeiro/caixa"]')).toHaveCount(0);
    await expect(page.locator('a[href="/app/financeiro/pagar"]')).toHaveCount(0);
  });

  test('ASB não vê nav financeiro', async ({ page }) => {
    await loginAs(page, ASSISTANT);
    await expect(page.locator('a[href="/app/financeiro/receber"]')).toHaveCount(0);
    await expect(page.locator('a[href="/app/financeiro/caixa"]')).toHaveCount(0);
    await expect(page.locator('a[href="/app/financeiro/pagar"]')).toHaveCount(0);
  });

  test('recepção vê aba Financeiro na ficha', async ({ page }) => {
    await loginAs(page, RECEPTION);
    await page.goto('/app/pacientes');
    await page.getByLabel('Buscar pacientes').fill(SEED_PATIENT);
    await page.getByRole('link', { name: /^Abrir paciente/ }).first().click();
    await expect(page).toHaveURL(/\/app\/pacientes\//);
    await expect(page.getByRole('tab', { name: 'Financeiro' })).toBeVisible();
    await page.getByRole('tab', { name: 'Financeiro' }).click();
    await expect(page.getByRole('heading', { name: 'Financeiro' })).toBeVisible();
    await expect(page.getByText('Saldo em aberto')).toBeVisible();
  });
});
