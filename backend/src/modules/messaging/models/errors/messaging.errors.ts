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
  }
}

export class IdempotencyKeyRequiredError extends AppError {
  constructor() {
    super('VALIDATION_ERROR', 'Header Idempotency-Key é obrigatório.', 400);
  }
}

export class IdempotencyKeyReusedError extends AppError {
  constructor() {
    super('IDEMPOTENCY_KEY_REUSED', 'Idempotency-Key já usada com outro payload.', 409);
  }
}

export class MediaNotImplementedError extends AppError {
  constructor() {
    super(
      'NOT_IMPLEMENTED',
      'Envio de mídia não suportado neste provedor. Use WAHA ou envie texto.',
      501,
    );
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor() {
    super('UNSUPPORTED_MEDIA_TYPE', 'Tipo de mídia não suportado na inbox.', 415);
  }
}

export class MediaTooLargeError extends AppError {
  constructor() {
    super('VALIDATION_ERROR', 'Arquivo excede o tamanho máximo de 20 MB.', 422);
  }
}

export class MediaNotUploadedError extends AppError {
  constructor() {
    super('VALIDATION_ERROR', 'Arquivo ainda não enviado ao storage.', 422);
  }
}

export class StorageUnavailableError extends AppError {
  constructor() {
    super('STORAGE_UNAVAILABLE', 'Object storage indisponível.', 503);
  }
}

export class AccountNotConnectedError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Conta WhatsApp não está conectada.', 422);
  }
}
