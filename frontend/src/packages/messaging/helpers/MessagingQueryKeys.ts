export const messagingQueryKeys = {
  account: ['messaging-account'] as const,
  qr: ['messaging-account-qr'] as const,
  usage: ['messaging-usage'] as const,
  logs: (result?: string) => ['messaging-logs', result ?? ''] as const,
  conversations: (query: Record<string, unknown>) =>
    ['messaging-conversations', query] as const,
  conversation: (id: string) => ['messaging-conversation', id] as const,
  messages: (conversationId: string) =>
    ['messaging-messages', conversationId] as const,
  pendingBadge: ['messaging-pending-badge'] as const,
  patientContext: (patientId: string) =>
    ['messaging-patient-context', patientId] as const,
};
