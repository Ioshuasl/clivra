import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import type { EmailMessage, EmailProvider } from './email.port.js';

const RESEND_API = 'https://api.resend.com/emails';
const TIMEOUT_MS = 10_000;
const RETRY_DELAYS_MS = [400, 1_500];

function retryable(status: number): boolean {
  return status === 429 || status >= 500;
}

export class ResendEmailAdapter implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string = env.MAIL_FROM,
  ) {}

  /** Envia e **lança** se o Resend recusar ou não responder (usado na verificação de deploy). */
  async sendStrict(message: EmailMessage): Promise<{ id?: string }> {
    let lastError: Error = new Error('Falha desconhecida no envio de e-mail.');
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
      try {
        const res = await fetch(RESEND_API, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            from: this.from,
            to: [message.to],
            subject: message.subject,
            text: message.text,
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (res.ok) {
          const body = (await res.json().catch(() => ({}))) as { id?: string };
          return { id: body.id };
        }
        const body = await res.text();
        lastError = new Error(`Resend respondeu ${res.status}: ${body.slice(0, 300)}`);
        if (!retryable(res.status)) break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
    throw lastError;
  }

  /** Envio do dia a dia: com tentativas e tempo limite; falha final só vai para o log (não derruba o fluxo). */
  async send(message: EmailMessage): Promise<void> {
    try {
      await this.sendStrict(message);
    } catch (err) {
      logger.error({ err, to: message.to, subject: message.subject }, 'email_send_failed');
    }
  }
}
