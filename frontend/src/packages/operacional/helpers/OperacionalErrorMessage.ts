import { friendlyApiError } from '@/shared/helpers/FriendlyApiError';

export function operacionalErrorMessage(error: unknown): string {
  return friendlyApiError(error);
}
