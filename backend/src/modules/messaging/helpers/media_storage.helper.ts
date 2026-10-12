export const MEDIA_PRESIGN_TTL_SECONDS = 900;
export const MEDIA_MAX_BYTES = 20 * 1024 * 1024;

export const INBOX_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export type InboxMediaMimeType = (typeof INBOX_MEDIA_MIME_TYPES)[number];

export function isInboxMediaMime(mimeType: string): mimeType is InboxMediaMimeType {
  return (INBOX_MEDIA_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function inboxMessageTypeFromMime(mimeType: string): 'IMAGE' | 'DOCUMENT' {
  return mimeType.startsWith('image/') ? 'IMAGE' : 'DOCUMENT';
}

export function buildMessagingMediaStorageKey(input: {
  tenantId: string;
  objectId: string;
  fileName: string;
}): string {
  const safe = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'file';
  return `tenants/${input.tenantId}/messaging/${input.objectId}/${safe}`;
}

export function fileNameFromStorageKey(storageKey: string): string {
  const parts = storageKey.split('/');
  return parts[parts.length - 1] || 'file';
}
