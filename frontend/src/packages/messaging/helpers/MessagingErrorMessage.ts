import { ApiClientError } from '@/shared/api/api-client';
import { friendlyApiError } from '@/shared/helpers/FriendlyApiError';

export function messagingErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'NOT_FOUND') return 'Nenhuma conta WhatsApp conectada.';
    if (error.code === 'PROVIDER_UNAVAILABLE') {
      return error.message || 'Falha no envio de teste. Verifique as credenciais.';
    }
    if (error.code === 'IDEMPOTENCY_KEY_REUSED') {
      return 'Esta mensagem já foi enviada com outro conteúdo. Tente de novo.';
    }
    if (error.code === 'PLAN_LIMIT_EXCEEDED' || error.code === 'SUBSCRIPTION_REQUIRED') {
      return error.message || 'Assinatura inativa. A inbox está somente leitura.';
    }
  }
  return friendlyApiError(error);
}
