import { test } from '@playwright/test';
import { loginAs } from '../e2e/helpers/auth';
import { OWNER } from '../e2e/helpers/credentials';

test('lista botões', async ({ page }) => {
  await loginAs(page, OWNER);
  for (const p of ['/app/financeiro/pagar', '/app/financeiro/caixa', '/app/financeiro/receber', '/app/configuracoes/cadeiras', '/app/orcamentos', '/app/configuracoes/clinica']) {
    await page.goto(p);
    await page.waitForTimeout(2500);
    const b = await page.locator('button:visible, a[role=button]:visible').evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim()).filter((t) => t && t.length < 40));
    console.log(p, JSON.stringify([...new Set(b)]));
  }
});
