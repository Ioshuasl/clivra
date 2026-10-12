import { env, wahaHmacKey, wahaWebhookUrl } from '../../config/env.js';
import type {
  MessagingProvider,
  SendMediaInput,
  SendResult,
  SendTemplateInput,
  SendTextInput,
  WahaSessionPort,
} from '../../../modules/messaging/types/ports/messaging_provider.port.js';
import { fromWahaChatId, toWahaChatId } from '../../../modules/messaging/helpers/waha_session.helper.js';

type WahaJson = Record<string, unknown>;

export class WahaClient implements MessagingProvider, WahaSessionPort {
  constructor(
    private readonly baseUrl = env.WAHA_BASE_URL.replace(/\/$/, ''),
    private readonly apiKey = env.WAHA_API_KEY ?? '',
  ) {}

  async ensureSession(sessionName: string): Promise<void> {
    const existing = await this.request('GET', `/api/sessions/${encodeURIComponent(sessionName)}`);
    if (existing.ok) return;

    const created = await this.request('POST', '/api/sessions', {
      name: sessionName,
      config: {
        webhooks: [
          {
            url: wahaWebhookUrl(),
            events: ['message', 'message.ack', 'session.status'],
            hmac: { key: wahaHmacKey() },
          },
        ],
      },
    });
    if (created.ok || created.status === 422 || created.status === 409) {
      if (!created.ok) {
        await this.request('POST', `/api/sessions/${encodeURIComponent(sessionName)}/start`, {});
      }
      return;
    }
    throw new Error(created.error ?? `WAHA session HTTP ${created.status}`);
  }

  async getQr(sessionName: string): Promise<{ qr: string | null; status: string; displayPhone: string | null }> {
    const session = await this.request('GET', `/api/sessions/${encodeURIComponent(sessionName)}`);
    const status = typeof session.json?.status === 'string' ? session.json.status : 'UNKNOWN';
    const me = session.json?.me && typeof session.json.me === 'object' ? (session.json.me as Record<string, unknown>) : null;
    const meId = typeof me?.id === 'string' ? fromWahaChatId(me.id) : null;
    const qr = await this.request(
      'GET',
      `/api/${encodeURIComponent(sessionName)}/auth/qr?format=raw`,
    );
    const value =
      typeof qr.json?.value === 'string'
        ? qr.json.value
        : typeof qr.json?.qr === 'string'
          ? qr.json.qr
          : null;
    return { qr: value, status, displayPhone: meId };
  }

  async logout(sessionName: string): Promise<void> {
    await this.request('POST', `/api/sessions/${encodeURIComponent(sessionName)}/logout`, {});
  }

  async sendTemplate(input: SendTemplateInput): Promise<SendResult> {
    if (input.buttons && input.buttons.length > 0) {
      const sent = await this.request('POST', '/api/sendButtons', {
        session: input.sessionName,
        chatId: toWahaChatId(input.to),
        header: 'Clínica',
        body: input.body,
        buttons: input.buttons.map((button) => ({ type: 'reply', text: button.text })),
      });
      if (sent.ok) return { providerMessageId: this.messageId(sent.json) };
      throw new Error(sent.error ?? `WAHA sendButtons HTTP ${sent.status}`);
    }
    return this.sendText({ sessionName: input.sessionName, to: input.to, body: input.body });
  }

  async sendText(input: SendTextInput): Promise<SendResult> {
    const sent = await this.request('POST', '/api/sendText', {
      session: input.sessionName,
      chatId: toWahaChatId(input.to),
      text: input.body,
    });
    if (!sent.ok) throw new Error(sent.error ?? `WAHA sendText HTTP ${sent.status}`);
    return { providerMessageId: this.messageId(sent.json) };
  }

  async sendMedia(input: SendMediaInput): Promise<SendResult> {
    const path = input.kind === 'IMAGE' ? '/api/sendImage' : '/api/sendFile';
    const sent = await this.request('POST', path, {
      session: input.sessionName,
      chatId: toWahaChatId(input.to),
      file: {
        url: input.fileUrl,
        mimetype: input.mimeType,
        filename: input.fileName,
      },
      ...(input.caption ? { caption: input.caption } : {}),
    });
    if (!sent.ok) throw new Error(sent.error ?? `WAHA ${path} HTTP ${sent.status}`);
    return { providerMessageId: this.messageId(sent.json) };
  }

  private messageId(json: WahaJson | undefined): string {
    const id = json?.id;
    if (typeof id === 'string' && id.length > 0) return id;
    const nested = json?.key;
    if (nested && typeof nested === 'object' && typeof (nested as { id?: unknown }).id === 'string') {
      return (nested as { id: string }).id;
    }
    throw new Error('WAHA não retornou id da mensagem.');
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ ok: boolean; status: number; json?: WahaJson; error?: string }> {
    if (!this.apiKey) throw new Error('WAHA_API_KEY ausente.');
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'X-Api-Key': this.apiKey,
        Accept: 'application/json',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = (await response.json().catch(() => ({}))) as WahaJson;
    const error =
      typeof json.message === 'string'
        ? json.message
        : typeof json.error === 'string'
          ? json.error
          : undefined;
    return { ok: response.ok, status: response.status, json, error };
  }
}
