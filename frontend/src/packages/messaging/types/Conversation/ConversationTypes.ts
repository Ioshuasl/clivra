import type { ConversationStatus } from '@/packages/messaging/enum/Conversation/ConversationStatusEnum';

export type ConversationSummary = {
  id: string;
  whatsappAccountId: string;
  patientId: string | null;
  contactPhone: string;
  contactName: string | null;
  status: ConversationStatus | (string & {});
  assignedToUserId: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  serviceWindowExpiresAt: string | null;
  createdAt: string;
};

export type ConversationListQuery = {
  status?: ConversationStatus;
  patientId?: string;
  q?: string;
  unread?: boolean;
  cursor?: string;
  limit?: number;
};

export type ConversationListResult = {
  items: ConversationSummary[];
  nextCursor: string | null;
};

export type ConversationPatchInput = {
  assignedToUserId?: string | null;
  status?: ConversationStatus;
  patientId?: string | null;
};
