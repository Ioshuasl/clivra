import { ApiClientError } from '@/shared/api/api-client';
import { friendlyApiError } from '@/shared/helpers/FriendlyApiError';

export function publicErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'NOT_FOUND') return error.message || 'Link inválido ou expirado.';
    if (error.code === 'SLOT_UNAVAILABLE') {
      return 'Este horário acabou de ser ocupado. Escolha outro.';
    }
    if (error.code === 'RATE_LIMITED') {
      return error.message || 'Muitas tentativas. Tente novamente em instantes.';
    }
  }
  return friendlyApiError(error);
}

export function suggestedSlotsFromError(error: unknown): string[] {
  if (!(error instanceof ApiClientError) || error.code !== 'SLOT_UNAVAILABLE') return [];
  const details = error.details;
  if (!Array.isArray(details) || details.length === 0) return [];
  const first = details[0] as { suggestedSlots?: unknown };
  if (!Array.isArray(first?.suggestedSlots)) return [];
  return first.suggestedSlots.filter((slot): slot is string => typeof slot === 'string');
}
