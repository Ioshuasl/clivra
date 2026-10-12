import type { ConversationSummary, InboxMessage } from '../../../types/messaging.types.js';

export function mapConversation(row: {
  id: string;
  whatsappAccountId: string;
  patientId: string | null;
  contactPhone: string;
  contactName: string | null;
  status: string;
  assignedTo: string | null;
  unreadCount: number;
  lastMessageAt: Date | null;
  serviceWindowExpiresAt: Date | null;
  createdAt: Date;
}): ConversationSummary {
  return {
    id: row.id,
    whatsappAccountId: row.whatsappAccountId,
    patientId: row.patientId,
    contactPhone: row.contactPhone,
    contactName: row.contactName,
    status: row.status,
    assignedToUserId: row.assignedTo,
    unreadCount: row.unreadCount,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    serviceWindowExpiresAt: row.serviceWindowExpiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapInboxMessage(row: {
  id: string;
  conversationId: string;
  direction: string;
  type: string;
  body: string | null;
  mediaKey: string | null;
  status: string;
  sentBy: string | null;
  createdAt: Date;
}): InboxMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    direction: row.direction,
    type: row.type,
    body: row.body,
    mediaKey: row.mediaKey,
    status: row.status,
    sentBy: row.sentBy,
    createdAt: row.createdAt.toISOString(),
  };
}
