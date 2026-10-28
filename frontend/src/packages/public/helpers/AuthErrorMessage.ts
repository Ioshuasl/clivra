import { friendlyApiError } from '@/shared/helpers/FriendlyApiError';

export function authErrorMessage(error: unknown): string {
  return friendlyApiError(error);
}
