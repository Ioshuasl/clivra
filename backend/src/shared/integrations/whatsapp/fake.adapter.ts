import { randomUUID } from 'node:crypto';
import type {
  MessagingProvider,
  SendMediaInput,
  SendResult,
  SendTemplateInput,
  SendTextInput,
  WahaSessionPort,
} from '../../../modules/messaging/types/ports/messaging_provider.port.js';

export class FakeMessagingProvider implements MessagingProvider, WahaSessionPort {
  readonly sentTemplates: SendTemplateInput[] = [];
  readonly sentTexts: SendTextInput[] = [];
  readonly sentMedia: SendMediaInput[] = [];

  async ensureSession(_sessionName: string): Promise<void> {}

  async getQr(_sessionName: string): Promise<{ qr: string | null; status: string; displayPhone: string | null }> {
    return { qr: 'FAKE-QR', status: 'SCAN_QR_CODE', displayPhone: null };
  }

  async logout(_sessionName: string): Promise<void> {}

  async sendTemplate(input: SendTemplateInput): Promise<SendResult> {
    this.sentTemplates.push(input);
    return { providerMessageId: `waha.fake.${randomUUID()}` };
  }

  async sendText(input: SendTextInput): Promise<SendResult> {
    this.sentTexts.push(input);
    return { providerMessageId: `waha.fake.${randomUUID()}` };
  }

  async sendMedia(input: SendMediaInput): Promise<SendResult> {
    this.sentMedia.push(input);
    return { providerMessageId: `waha.fake.${randomUUID()}` };
  }
}
