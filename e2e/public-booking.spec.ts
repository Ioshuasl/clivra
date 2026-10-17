import { expect, test } from '@playwright/test';
import {
  captureDebugOtp,
  getSeedClinicSlug,
  chooseAnyPublicProfessional,
  pickFirstPublicSlot,
  waitForMailpitOtp,
} from './helpers/public-booking';

test.describe('Public booking (E4b)', () => {
  test('slug inválido mostra 404', async ({ page }) => {
    await page.goto('/agendar/clinica-inexistente-zzzzzzzz');
    await expect(page.getByText('Clínica não encontrada.')).toBeVisible();
  });

  test('link de confirmação inválido', async ({ page }) => {
    await page.goto('/agendar/qualquer/confirmar/token-invalido');
    await expect(page.getByText('Link inválido ou expirado.')).toBeVisible();
  });

  test('aceite da fila com token inválido', async ({ page }) => {
    await page.goto('/fila/token-invalido');
    await page.getByRole('button', { name: 'Aceitar horário' }).click();
    await expect(page.getByText('Link inválido ou expirado.')).toBeVisible();
  });

  test('OTP inválido mostra erro', async ({ page }) => {
    const slug = await getSeedClinicSlug();
    const stamp = Date.now();
    await page.goto(`/agendar/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await chooseAnyPublicProfessional(page);
    await pickFirstPublicSlot(page);

    await page.getByLabel('Nome completo').fill(`Paciente OTP ${stamp}`);
    await page.getByLabel('Telefone').fill(`6298${String(stamp).slice(-7)}`);
    await page.getByLabel('E-mail').fill(`e2e-otp-${stamp}@example.com`);
    await page.getByRole('checkbox', { name: /Aceito o tratamento dos meus dados pessoais/i }).click();
    await page.getByRole('checkbox', { name: /Aceito os termos de uso/i }).click();
    await page.getByRole('button', { name: 'Enviar código' }).click();

    await expect(page.getByText(/código de 6 dígitos/i)).toBeVisible({ timeout: 20_000 });
    await page.getByLabel('Código de verificação').fill('000000');
    await page.getByRole('button', { name: 'Confirmar agendamento' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/c[oó]digo inv[aá]lido|expirado|invalidado/i)).toBeVisible();
  });

  test('agenda ponta a ponta com OTP (fake / Mailpit)', async ({ page }) => {
    const slug = await getSeedClinicSlug();
    const stamp = Date.now();
    const email = `e2e-book-${stamp}@example.com`;
    const debugOtp = captureDebugOtp(page);

    await page.goto(`/agendar/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByText(/Reserve seu horário|dentista define o atendimento/i).first(),
    ).toBeVisible();

    await chooseAnyPublicProfessional(page);
    await pickFirstPublicSlot(page);

    await page.getByLabel('Nome completo').fill(`Paciente Público ${stamp}`);
    await page.getByLabel('Telefone').fill(`6299${String(stamp).slice(-7)}`);
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel(/O que te traz/i).fill('Limpeza');
    await page.getByRole('checkbox', { name: /Aceito o tratamento dos meus dados pessoais/i }).click();
    await page.getByRole('checkbox', { name: /Aceito os termos de uso/i }).click();
    await page.getByRole('button', { name: 'Enviar código' }).click();

    await expect(page.getByText(/código de 6 dígitos/i)).toBeVisible({ timeout: 20_000 });
    const otp = debugOtp.read() ?? (await waitForMailpitOtp(email));
    await page.getByLabel('Código de verificação').fill(otp);
    await page.getByRole('button', { name: 'Confirmar agendamento' }).click();

    await expect(
      page.getByRole('heading', { name: /Pedido enviado|Horário confirmado/ }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Consulta \/ avalia/i)).toBeVisible();
  });
});
