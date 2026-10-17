import type { Page } from '@playwright/test';
import { OWNER } from './credentials';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3333';
const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';

export async function getSeedClinicSlug(): Promise<string> {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: OWNER.email, password: OWNER.password }),
    });
    lastStatus = res.status;
    if (res.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 16_000));
      continue;
    }
    if (!res.ok) {
      throw new Error(`login seed falhou: ${res.status}`);
    }
    const json = (await res.json()) as { data?: { tenant?: { slug?: string } } };
    const slug = json.data?.tenant?.slug;
    if (!slug) {
      throw new Error('slug da clínica seed não retornado');
    }
    return slug;
  }
  throw new Error(`login seed falhou: ${lastStatus}`);
}

export async function waitForMailpitOtp(email: string, timeoutMs = 20_000): Promise<string> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    if (search.ok) {
      const list = (await search.json()) as { messages?: Array<{ ID: string }> };
      const id = list.messages?.[0]?.ID;
      if (id) {
        const msg = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`);
        if (msg.ok) {
          const body = (await msg.json()) as { Text?: string; HTML?: string };
          const text = `${body.Text ?? ''} ${body.HTML ?? ''}`;
          const match = text.match(/c[oó]digo é\s+(\d{6})/i) ?? text.match(/\b(\d{6})\b/);
          if (match?.[1]) return match[1];
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`OTP não encontrado no Mailpit para ${email}`);
}

/** Aguarda disponibilidade carregar e escolhe o 1º horário livre (pula fim de semana/seed). */
/** Passo 1: escolhe "Qualquer profissional" (ou o primeiro profissional) e avança. */
export async function chooseAnyPublicProfessional(page: Page): Promise<void> {
  const anyProfessional = page.getByRole('button', { name: /Qualquer profissional/i });
  await anyProfessional.waitFor({ state: 'visible', timeout: 30_000 });
  await anyProfessional.click();
  await page.getByRole('button', { name: 'Continuar' }).click();
}

export async function pickFirstPublicSlot(page: Page): Promise<void> {
  const next = page.getByRole('button', { name: /^Próximos/ });
  await next.waitFor({ state: 'visible', timeout: 45_000 });

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const dayWithSlots = page.getByRole('button').filter({ hasText: /[1-9]\d*\s+horários/ }).first();
    if (await dayWithSlots.isVisible().catch(() => false)) {
      await dayWithSlots.click();
    }

    const slot = page.getByRole('button', { name: /^\d{1,2}:\d{2}$/ }).first();
    if (await slot.isVisible().catch(() => false)) {
      await slot.click();
      await page.getByRole('button', { name: 'Continuar' }).click();
      return;
    }

    await next.click();
    await next.waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForTimeout(300);
  }
  throw new Error('Nenhum horário público disponível');
}

export function captureDebugOtp(page: Page): { read: () => string | undefined } {
  let otp: string | undefined;
  page.on('response', async (response) => {
    if (response.request().method() !== 'POST') return;
    if (!response.url().includes('/bookings') || response.url().includes('/verify')) return;
    try {
      const json = (await response.json()) as { data?: { debugOtp?: string } };
      if (json.data?.debugOtp) otp = json.data.debugOtp;
    } catch {
      // ignore non-json
    }
  });
  return { read: () => otp };
}
