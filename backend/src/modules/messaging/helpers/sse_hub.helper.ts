import { EventEmitter } from 'node:events';

export type MessagingStreamEventType = 'message_received' | 'unread_updated';

export type MessagingStreamEvent = {
  type: MessagingStreamEventType;
  data: Record<string, unknown>;
};

class MessagingSseHub {
  private readonly bus = new EventEmitter();

  constructor() {
    this.bus.setMaxListeners(200);
  }

  publish(tenantId: string, event: MessagingStreamEvent): void {
    this.bus.emit(tenantId, event);
  }

  subscribe(tenantId: string, listener: (event: MessagingStreamEvent) => void): () => void {
    this.bus.on(tenantId, listener);
    return () => {
      this.bus.off(tenantId, listener);
    };
  }
}

export const messagingSseHub = new MessagingSseHub();
