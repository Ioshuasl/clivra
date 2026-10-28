import { ApiClientError } from '@/shared/api/api-client';
import { friendlyApiError } from '@/shared/helpers/FriendlyApiError';

export function adminErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'SUBSCRIPTION_REQUIRED') {
      return error.message || 'Assinatura inativa. A clínica está em somente leitura.';
    }
    if (error.code === 'FORBIDDEN') {
      return error.message || 'Você não tem permissão para este recurso.';
    }
    if (error.code === 'PERIOD_TOO_LONG') {
      return 'O período máximo é de 366 dias.';
    }
    if (error.code === 'PERIOD_INVALID') {
      return 'Informe um período válido (de ≤ até).';
    }
    if (error.code === 'DSR_STATUS_INVALID') {
      return 'Esta solicitação não pode mudar para o status informado.';
    }
    if (error.code === 'IDEMPOTENCY_KEY_REUSED') {
      return 'Esta exportação já foi solicitada. Aguarde o arquivo ficar pronto.';
    }
    if (error.code === 'NOT_IMPLEMENTED') {
      return error.message || 'Exportação XLSX ainda não está disponível. Use CSV.';
    }
  }
  return friendlyApiError(error);
}
