import type {
  MessagingProvider,
  SendMediaInput,
  SendResult,
  SendTemplateInput,
  SendTextInput,
} from '../../../modules/messaging/types/ports/messaging_provider.port.js';

export class WhatsAppCloudProvider implements MessagingProvider {
  async sendTemplate(_input: SendTemplateInput): Promise<SendResult> {
    throw new Error('Cloud API não está ativa. Use WAHA (ADR-0016) ou MESSAGING_PROVIDER=waha.');
  }

  async sendText(_input: SendTextInput): Promise<SendResult> {
    throw new Error('Cloud API não está ativa. Use WAHA (ADR-0016).');
  }

  async sendMedia(_input: SendMediaInput): Promise<SendResult> {
    throw new Error('Cloud API não está ativa. Use WAHA (ADR-0016).');
  }
}
