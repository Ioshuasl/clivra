import { ApiClientError } from '@/shared/api/api-client';
import { friendlyApiError } from '@/shared/helpers/FriendlyApiError';

export function clinicoErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 403) return 'Você não tem permissão para acessar o prontuário.';
    if (error.code === 'RECORD_IMMUTABLE') {
      return 'Esta evolução é imutável. Use corrigir para gerar uma nova versão.';
    }
    if (error.code === 'TOOTH_STATE_CONFLICT') {
      return 'Conflito no odontograma. Informe uma justificativa (mín. 10 caracteres).';
    }
  }
  return friendlyApiError(error);
}
