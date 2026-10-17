import { expect, test, type Locator, type Page } from '@playwright/test';
import { loginAs } from '../e2e/helpers/auth';
import { OWNER, RECEPTION, SEED_PATIENT } from '../e2e/helpers/credentials';
import { ensureOpenInstallmentForMaria } from '../e2e/helpers/billing';
import {
  chooseAnyPublicProfessional,
  getSeedClinicSlug,
  pickFirstPublicSlot,
  captureDebugOtp,
  waitForMailpitOtp,
} from '../e2e/helpers/public-booking';
import { BR_TO_EU, saveJson, throttle } from './lib';

type FlowResult = { flow: string; mode: string; ok: boolean; ms: number; interactions: number; note?: string };

/** Conta cada clique/digitação como uma "interação" do usuário. */
function counter(page: Page) {
  let n = 0;
  return {
    get count() {
      return n;
    },
    click: async (l: Locator) => {
      n += 1;
      await l.click();
    },
    fill: async (l: Locator, v: string) => {
      n += 1;
      await l.fill(v);
    },
    select: async (l: Locator, v: string | { label: string }) => {
      n += 1;
      await l.selectOption(v as never);
    },
    page,
  };
}

test('fluxos cronometrados com contagem de interações (local e Brasil→Europa)', async ({ browser }) => {
  test.setTimeout(900_000);
  const results: FlowResult[] = [];
  await ensureOpenInstallmentForMaria();
  const slug = await getSeedClinicSlug();

  for (const mode of ['local', 'br-eu'] as const) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'pt-BR' });
    const page = await context.newPage();
    const run = async (flow: string, body: (i: ReturnType<typeof counter>) => Promise<void>, note?: string) => {
      const i = counter(page);
      const t0 = Date.now();
      let ok = true;
      let err = note;
      try {
        await body(i);
      } catch (e) {
        ok = false;
        err = `${note ?? ''} ${String(e).split('\n')[0]}`.trim();
      }
      results.push({ flow, mode, ok, ms: Date.now() - t0, interactions: i.count, note: err });
    };

    // 1) Login (recepção) — até ver a tela inicial.
    await run('Login até a tela inicial', async () => {
      await loginAs(page, RECEPTION);
    });
    if (mode === 'br-eu') await throttle(context, page, BR_TO_EU);

    // 2) Cadastrar paciente novo.
    await run('Cadastrar paciente novo', async (i) => {
      await page.goto('/app/pacientes');
      await i.click(page.getByRole('button', { name: 'Novo paciente' }));
      const stamp = Date.now();
      await i.fill(page.getByLabel('Nome completo'), `Paciente Auditoria ${stamp}`);
      await i.fill(page.getByLabel('Telefone', { exact: true }), `6299${String(stamp).slice(-7)}`);
      await i.click(page.getByRole('button', { name: 'Criar paciente' }));
      await expect(page).toHaveURL(/\/app\/pacientes\//, { timeout: 30_000 });
    });

    // 3) Achar paciente e abrir a ficha.
    await run('Buscar paciente e abrir a ficha', async (i) => {
      await page.goto('/app/pacientes');
      await i.fill(page.getByLabel('Buscar pacientes'), 'Maria');
      await i.click(page.getByRole('link', { name: /^Abrir paciente/ }).first());
      await expect(page.getByRole('heading', { name: SEED_PATIENT })).toBeVisible();
    });

    // 4) Agendar consulta pelo "Novo agendamento".
    await run('Agendar consulta (botão Novo agendamento)', async (i) => {
      await page.goto('/app/agenda');
      await i.click(page.getByRole('button', { name: 'Novo agendamento' }));
      await i.fill(page.getByPlaceholder('Buscar paciente…'), 'Maria');
      await i.click(page.getByRole('option', { name: new RegExp(SEED_PATIENT) }).first());
      const prof = page.locator('#appt-professional');
      if (await prof.isVisible().catch(() => false)) {
        const v = await prof.locator('option').nth(1).getAttribute('value');
        if (v) await i.select(prof, v);
      }
      await i.click(page.getByRole('button', { name: 'Agendar', exact: true }));
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 30_000 });
    }, 'pode falhar por conflito de horário se já houver reserva');

    // 5) Receber pagamento (painel financeiro).
    await run('Receber parcela em PIX', async (i) => {
      await page.goto('/app/financeiro');
      const row = page
        .getByRole('listitem')
        .filter({ hasText: SEED_PATIENT })
        .filter({ has: page.getByRole('button', { name: 'Receber' }) });
      await i.click(row.first().getByRole('button', { name: 'Receber' }));
      await i.click(page.getByRole('button', { name: 'Confirmar baixa' }));
      await expect(page.getByText(/Recibo nº/i)).toBeVisible({ timeout: 30_000 });
    });

    // 6) Ver relatório de faltas a partir do início.
    await run('Início → relatório de faltas', async (i) => {
      await page.goto('/app');
      await i.click(page.getByTestId('dashboard-kpi-grid').getByRole('link', { name: /Faltas no mês/ }));
      await expect(page.getByRole('heading', { name: 'Faltas', level: 1 })).toBeVisible({ timeout: 30_000 });
    });
    await context.close();

    // 7) Dono: orçamento (criar + enviar link).
    const octx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'pt-BR' });
    const op = await octx.newPage();
    await loginAs(op, OWNER);
    if (mode === 'br-eu') await throttle(octx, op, BR_TO_EU);
    const runOwner = async (flow: string, body: (i: ReturnType<typeof counter>) => Promise<void>) => {
      const i = counter(op);
      const t0 = Date.now();
      let ok = true;
      let err: string | undefined;
      try {
        await body(i);
      } catch (e) {
        ok = false;
        err = String(e).split('\n')[0];
      }
      results.push({ flow, mode, ok, ms: Date.now() - t0, interactions: i.count, note: err });
    };
    await runOwner('Criar orçamento e gerar link', async (i) => {
      await op.goto('/app/orcamentos');
      await i.click(op.getByRole('button', { name: 'Novo orçamento' }));
      const sheet = op.getByRole('dialog');
      await i.fill(sheet.locator('#quote-patient'), SEED_PATIENT);
      await i.click(op.getByRole('option', { name: new RegExp(SEED_PATIENT) }).first());
      await i.select(sheet.locator('#quote-professional'), { label: 'Dra. Ana Souza' });
      await i.fill(sheet.locator('#quote-item-procedure-0'), 'Restauração em resina');
      await i.click(op.getByRole('option', { name: 'Restauração em resina — 1 face' }).first());
      await i.click(sheet.getByRole('button', { name: 'Criar orçamento' }));
      await expect(op.getByRole('dialog')).toHaveCount(0, { timeout: 30_000 });
      await i.click(op.getByRole('button', { name: 'Enviar' }).first());
      await i.click(op.getByRole('radio', { name: 'Copiar link' }));
      await i.click(op.getByRole('dialog').getByRole('button', { name: 'Enviar', exact: true }));
      await expect(op.locator('#quote-public-url')).toBeVisible({ timeout: 30_000 });
    });
    await runOwner('Lançar despesa (conta a pagar)', async (i) => {
      await op.goto('/app/financeiro');
      await i.click(op.getByRole('button', { name: 'Registrar movimentação' }));
      await i.click(op.getByRole('dialog').getByRole('button', { name: 'Saída (pagar)' }));
      await i.click(op.getByRole('dialog').getByRole('button', { name: 'Nova conta a pagar' }));
      const category = op.locator('#payable-category');
      await expect(category.locator('option').nth(1)).toBeAttached({ timeout: 30_000 });
      await i.select(category, (await category.locator('option').nth(1).getAttribute('value')) ?? '');
      await i.fill(op.locator('#payable-desc'), `Despesa auditoria ${Date.now()}`);
      await i.fill(op.locator('#payable-amount'), '350,00');
      const due = new Date();
      due.setDate(due.getDate() + 5);
      await i.fill(op.locator('#payable-due'), due.toISOString().slice(0, 10));
      await i.click(op.getByRole('button', { name: 'Salvar' }));
      await expect(op.getByRole('dialog')).toHaveCount(0, { timeout: 30_000 });
    });
    await octx.close();

    // 8) Paciente agenda sozinho pelo link público.
    const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR', isMobile: true, hasTouch: true });
    const pp = await pctx.newPage();
    if (mode === 'br-eu') await throttle(pctx, pp, BR_TO_EU);
    const pi = counter(pp);
    const pt0 = Date.now();
    let pok = true;
    let perr: string | undefined;
    try {
      const stamp = Date.now();
      const email = `auditoria-${stamp}@example.com`;
      const debugOtp = captureDebugOtp(pp);
      await pp.goto(`/agendar/${slug}`);
      await chooseAnyPublicProfessional(pp);
      pi['count'];
      await pickFirstPublicSlot(pp);
      await pp.getByLabel('Nome completo').fill(`Paciente Público ${stamp}`);
      await pp.getByLabel('Telefone', { exact: true }).fill(`6298${String(stamp).slice(-7)}`);
      await pp.getByLabel('E-mail').fill(email);
      await pp.getByRole('checkbox', { name: /Aceito o tratamento dos meus dados pessoais/i }).click();
      await pp.getByRole('checkbox', { name: /Aceito os termos de uso/i }).click();
      await pp.getByRole('button', { name: 'Enviar código' }).click();
      await expect(pp.getByText(/código de 6 dígitos/i)).toBeVisible({ timeout: 30_000 });
      const otp = debugOtp.read() ?? (await waitForMailpitOtp(email));
      await pp.getByLabel('Código de verificação').fill(otp);
      await pp.getByRole('button', { name: 'Confirmar agendamento' }).click();
      await expect(pp.getByRole('heading', { name: /Pedido enviado|Horário confirmado/ })).toBeVisible({ timeout: 30_000 });
    } catch (e) {
      pok = false;
      perr = String(e).split('\n')[0];
    }
    // passos do paciente: profissional(2) + horário(2) + 3 campos + 2 aceites + enviar + código + confirmar = 12
    results.push({ flow: 'Paciente agenda pelo link público (celular)', mode, ok: pok, ms: Date.now() - pt0, interactions: 12, note: perr });
    await pctx.close();
  }

  saveJson('flows.json', results);
});
