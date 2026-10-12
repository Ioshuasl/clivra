import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import type { UsageMetric } from '../../enum/usage/usage_metric.enum.js';

export class SubscriptionRequiredError extends AppError {
  constructor(status: string) {
    super(
      'SUBSCRIPTION_REQUIRED',
      `Assinatura ${status.toLowerCase()}: somente leitura e exportação estão liberadas. Fale conosco para reativar.`,
      402,
      { subscriptionStatus: status },
    );
    this.name = 'SubscriptionRequiredError';
  }
}

export class PlanLimitExceededError extends AppError {
  constructor(metric: UsageMetric, limit: number, current: number) {
    const labels: Record<string, string> = {
      professionals: 'profissionais',
      admin_users: 'usuários administrativos',
      units: 'unidades',
      storage_bytes: 'armazenamento',
      messages_month: 'mensagens do mês',
      patients: 'pacientes',
    };
    const label = labels[metric] ?? metric;
    super(
      'PLAN_LIMIT_EXCEEDED',
      `Seu plano permite ${limit} ${label} (uso atual: ${current}). Veja os planos em Assinatura ou fale conosco para fazer upgrade.`,
      402,
      { metric, limit, current },
    );
    this.name = 'PlanLimitExceededError';
  }
}

export class SubscriptionNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Assinatura não encontrada.', 404);
    this.name = 'SubscriptionNotFoundError';
  }
}

export class PlanNotFoundError extends AppError {
  constructor() {
    super('PLAN_NOT_FOUND', 'Plano não encontrado ou indisponível.', 422);
    this.name = 'PlanNotFoundError';
  }
}

export class BillingUnavailableError extends AppError {
  constructor() {
    super(
      'BILLING_UNAVAILABLE',
      'O pagamento automático está indisponível no momento. Fale conosco para ativar seu plano.',
      503,
    );
    this.name = 'BillingUnavailableError';
  }
}

/** Falha do gateway (Asaas). `inconclusive` = a operação pode ter sido processada. */
export class BillingGatewayError extends AppError {
  constructor(inconclusive: boolean) {
    super(
      'BILLING_GATEWAY_ERROR',
      'Não foi possível concluir a cobrança com o gateway de pagamento. Tente novamente em instantes.',
      502,
      { inconclusive },
    );
    this.name = 'BillingGatewayError';
  }
}

export class SubscriptionAlreadyActiveError extends AppError {
  constructor(status: string) {
    super(
      'SUBSCRIPTION_ALREADY_ACTIVE',
      status === 'PAST_DUE'
        ? 'Há uma cobrança em atraso. Pague a fatura em aberto em Assinatura.'
        : 'Sua assinatura já está ativa.',
      409,
      { subscriptionStatus: status },
    );
    this.name = 'SubscriptionAlreadyActiveError';
  }
}

export class CpfCnpjRequiredError extends AppError {
  constructor() {
    super(
      'CPF_CNPJ_REQUIRED',
      'Informe o CPF ou CNPJ do responsável pela cobrança para continuar.',
      422,
    );
    this.name = 'CpfCnpjRequiredError';
  }
}

/** Configuração do ambiente impede o checkout (ex.: APP_PUBLIC_URL em localhost; o Asaas exige URL pública). */
export class BillingMisconfiguredError extends AppError {
  constructor(reason: string) {
    super(
      'BILLING_MISCONFIGURED',
      'O pagamento com cartão está indisponível neste ambiente. Fale com o suporte.',
      503,
      { reason },
    );
    this.name = 'BillingMisconfiguredError';
  }
}

export class BillingIdempotencyKeyRequiredError extends AppError {
  constructor() {
    super('VALIDATION_ERROR', 'Header Idempotency-Key é obrigatório.', 400);
    this.name = 'BillingIdempotencyKeyRequiredError';
  }
}

export class BillingIdempotencyKeyReusedError extends AppError {
  constructor() {
    super('IDEMPOTENCY_KEY_REUSED', 'Esta Idempotency-Key já foi usada com outros dados.', 409);
    this.name = 'BillingIdempotencyKeyReusedError';
  }
}

export class CheckoutInProgressError extends AppError {
  constructor() {
    super('CHECKOUT_IN_PROGRESS', 'Já existe um checkout em andamento com esta chave.', 409);
    this.name = 'CheckoutInProgressError';
  }
}

export class InvalidWebhookTokenError extends AppError {
  constructor() {
    super('INVALID_WEBHOOK_TOKEN', 'Token do webhook inválido.', 401);
    this.name = 'InvalidWebhookTokenError';
  }
}

export class NoBillingSubscriptionError extends AppError {
  constructor() {
    super('NO_BILLING_SUBSCRIPTION', 'Não há cobrança recorrente ativa para cancelar.', 409);
    this.name = 'NoBillingSubscriptionError';
  }
}

export class PaymentNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Cobrança não encontrada.', 404);
    this.name = 'PaymentNotFoundError';
  }
}
