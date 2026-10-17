import { expect, test } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { ensureOpenInstallmentForMaria } from './helpers/billing';
import { ASSISTANT, DENTIST, FINANCE, RECEPTION, SEED_PATIENT } from './helpers/credentials';

function parseReaisToCents(value: string): number {
  return Math.round(Number(value.replace(/\./g, '').replace(',', '.')) * 100);
}

function centsToReais(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

test.describe('Painel financeiro — receber (recepção)', () => {
  test('baixa PIX+CASH da Maria pelo painel, recibo visível e COPY sem Meta', async ({ page }) => {
    // COPY exige PDF gerado pelo worker — pode levar >90s sob carga.
    test.setTimeout(180_000);
    await ensureOpenInstallmentForMaria();

    await loginAs(page, RECEPTION);
    await expect(
      page.getByRole('navigation', { name: 'Navegação principal' }).locator('a[href="/app/financeiro"]'),
    ).toBeVisible();
    await page.goto('/app/financeiro');
    await expect(page.getByRole('heading', { name: 'Hoje na clínica', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Movimentações' })).toBeVisible();

    const mariaRow = page
      .getByRole('listitem')
      .filter({ hasText: SEED_PATIENT })
      .filter({ has: page.getByRole('button', { name: 'Receber' }) });
    await expect(mariaRow.first()).toBeVisible({ timeout: 20_000 });
    await mariaRow.first().getByRole('button', { name: 'Receber' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Baixa de parcela')).toBeVisible();

    // O diálogo já vem com o saldo da parcela em PIX; divide em PIX + dinheiro.
    const balanceCents = parseReaisToCents(await page.locator('#payment-amount-0').inputValue());
    expect(balanceCents).toBeGreaterThan(1);
    const pixCents = Math.floor(balanceCents / 2);
    await page.locator('#payment-method-0').selectOption('PIX');
    await page.locator('#payment-amount-0').fill(centsToReais(pixCents));
    await page.getByRole('button', { name: '+ Forma de pagamento' }).click();
    await page.locator('#payment-method-1').selectOption('CASH');
    await page.locator('#payment-amount-1').fill(centsToReais(balanceCents - pixCents));

    // Sem abrir caixa: o ciclo de caixa está desativado e dinheiro é aceito.
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
  test('FINANCE vê Financeiro, o painel e o botão de registrar movimentação', async ({ page }) => {
    await loginAs(page, FINANCE);
    await expect(
      page.getByRole('navigation', { name: 'Navegação principal' }).locator('a[href="/app/financeiro"]'),
    ).toBeVisible();
    await page.goto('/app/financeiro');
    await expect(page.getByRole('heading', { name: 'Hoje na clínica', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Registrar movimentação' })).toBeVisible();
    await expect(page.locator('main a[href="/app/financeiro/relatorios"]')).toBeVisible();
  });

  test('recepção vê o painel financeiro', async ({ page }) => {
    await loginAs(page, RECEPTION);
    await page.goto('/app/financeiro');
    await expect(page.getByRole('heading', { name: 'Hoje na clínica', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Registrar movimentação' })).toBeVisible();
  });

  test('DENTIST não vê Financeiro na navegação', async ({ page }) => {
    await loginAs(page, DENTIST);
    await expect(
      page.getByRole('navigation', { name: 'Navegação principal' }).locator('a[href="/app/financeiro"]'),
    ).toHaveCount(0);
  });

  test('ASB não vê Financeiro na navegação', async ({ page }) => {
    await loginAs(page, ASSISTANT);
    await expect(
      page.getByRole('navigation', { name: 'Navegação principal' }).locator('a[href="/app/financeiro"]'),
    ).toHaveCount(0);
  });

  test('recepção vê aba Financeiro na ficha', async ({ page }) => {
    await loginAs(page, RECEPTION);
    await page.goto('/app/pacientes');
    await page.getByLabel('Buscar pacientes').fill(SEED_PATIENT);
    await page.getByRole('link', { name: /^Abrir paciente/ }).first().click();
    await expect(page).toHaveURL(/\/app\/pacientes\//);
    await expect(page.getByRole('tab', { name: 'Financeiro' })).toBeVisible();
    await page.getByRole('tab', { name: 'Financeiro' }).click();
    await expect(page.getByText('Saldo em aberto')).toBeVisible();
  });
});
