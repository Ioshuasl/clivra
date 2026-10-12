import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';

export class AccountNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Conta WhatsApp não encontrada.', 404);
  }
}

export class AccountAlreadyConnectedError extends AppError {
  constructor() {
    super('DUPLICATE_RESOURCE', 'Já existe uma conta WhatsApp neste tenant.', 409);
  }
}

export class KillSwitchActiveError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Envio bloqueado pelo kill switch.', 422);
  }
}

export class WebhookSignatureInvalidError extends AppError {
  constructor() {
    super('UNAUTHENTICATED', 'Assinatura do webhook inválida.', 401);
  }
}

export class ConversationNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Conversa não encontrada.', 404);
    this.name = 'ConversationNotFoundError';
  }
}

export class AccountNotConnectedError extends AppError {
  constructor() {
    super('PROVIDER_UNAVAILABLE', 'WhatsApp desconectado. Reconecte a conta para enviar.', 503);
    this.name = 'AccountNotConnectedError';
  }
}

export class InboxPatientNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Paciente não encontrado.', 404);
    this.name = 'InboxPatientNotFoundError';
  }
}

export class IdempotencyKeyRequiredError extends AppError {
  constructor() {
    super('VALIDATION_ERROR', 'Header Idempotency-Key é obrigatório.', 400);
    this.name = 'IdempotencyKeyRequiredError';
  }
}

export class IdempotencyKeyReusedError extends AppError {
  constructor() {
    super('IDEMPOTENCY_KEY_REUSED', 'Idempotency-Key já usada com outro payload.', 409);
    this.name = 'IdempotencyKeyReusedError';
  }
}

export class InvalidMediaError extends AppError {
  constructor(message = 'Arquivo de mídia inválido.') {
    super('VALIDATION_ERROR', message, 422);
    this.name = 'InvalidMediaError';
  }
}

export class MediaNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Arquivo não encontrado no storage.', 404);
    this.name = 'MediaNotFoundError';
  }
}

export class StorageUnavailableError extends AppError {
  constructor() {
    super('PROVIDER_UNAVAILABLE', 'Storage indisponível.', 503);
    this.name = 'StorageUnavailableError';
  }
}
