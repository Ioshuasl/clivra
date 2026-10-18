import { messagingMode } from '../../config/env.js';
import type {
  MessagingProvider,
  WahaSessionPort,
} from '../../../modules/messaging/types/ports/messaging_provider.port.js';
import { FakeMessagingProvider } from './fake.adapter.js';
import { WhatsAppCloudProvider } from './cloud.adapter.js';
import { WahaClient } from './waha.client.js';

let singleton: (MessagingProvider & Partial<WahaSessionPort>) | undefined;

export function getMessagingProvider(): MessagingProvider {
  if (process.env.NODE_ENV === 'test') {
    if (!(singleton instanceof FakeMessagingProvider)) {
      singleton = new FakeMessagingProvider();
    }
    return singleton;
  }
  if (!singleton) {
    const mode = messagingMode();
    if (mode === 'cloud') singleton = new WhatsAppCloudProvider();
    else if (mode === 'waha') singleton = new WahaClient();
    else singleton = new FakeMessagingProvider();
  }
  return singleton;
}

function isWahaSessionPort(value: MessagingProvider): value is MessagingProvider & WahaSessionPort {
  const candidate = value as Partial<WahaSessionPort>;
  return (
    typeof candidate.ensureSession === 'function' &&
    typeof candidate.getQr === 'function' &&
    typeof candidate.logout === 'function'
  );
}

export function getWahaSessionPort(): WahaSessionPort {
  const provider = getMessagingProvider();
  if (isWahaSessionPort(provider)) return provider;
  return new FakeMessagingProvider();
}

export function setMessagingProvider(provider: MessagingProvider | undefined): void {
  singleton = provider;
}

export type { MessagingProvider } from '../../../modules/messaging/types/ports/messaging_provider.port.js';
export { FakeMessagingProvider } from './fake.adapter.js';
export { WhatsAppCloudProvider } from './cloud.adapter.js';
