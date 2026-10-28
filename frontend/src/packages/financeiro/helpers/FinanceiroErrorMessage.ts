import { friendlyApiError } from '@/shared/helpers/FriendlyApiError';

export function financeiroErrorMessage(error: unknown): string {
  return friendlyApiError(error);
}
