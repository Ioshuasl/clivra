import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';

export class QuoteNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Orçamento não encontrado.', 404);
    this.name = 'QuoteNotFoundError';
  }
}

export class QuoteItemNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Item do orçamento não encontrado.', 404);
    this.name = 'QuoteItemNotFoundError';
  }
}

export class QuoteNotDraftError extends AppError {
  constructor(status: string) {
    super(
      'INVALID_STATE_TRANSITION',
      'Orçamento só pode ser editado em rascunho.',
      409,
      { from: status, to: 'DRAFT' },
    );
    this.name = 'QuoteNotDraftError';
  }
}

export class DiscountLimitExceededError extends AppError {
  constructor(maxPercent: number) {
    super(
      'DISCOUNT_LIMIT_EXCEEDED',
      `Desconto acima do limite do papel (${maxPercent}%).`,
      422,
      { maxPercent },
    );
    this.name = 'DiscountLimitExceededError';
  }
}

export class ToothRequiredError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Informe o dente (ex.: 26) para este procedimento.', 422);
    this.name = 'ToothRequiredError';
  }
}

export class FaceRequiredError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Procedimento exige face do dente.', 422);
    this.name = 'FaceRequiredError';
  }
}

export class InvalidToothCodeError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Código FDI do dente inválido.', 422);
    this.name = 'InvalidToothCodeError';
  }
}

export class ProcedureNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Procedimento não encontrado.', 404);
    this.name = 'ProcedureNotFoundError';
  }
}

export class ProcedureInactiveError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Procedimento inativo não pode entrar no orçamento.', 422);
    this.name = 'ProcedureInactiveError';
  }
}

export class ProfessionalNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Profissional não encontrado.', 404);
    this.name = 'ProfessionalNotFoundError';
  }
}

export class PatientRequiredError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Paciente não encontrado.', 404);
    this.name = 'PatientRequiredError';
  }
}

export class InvalidQuoteMoneyError extends AppError {
  constructor(message = 'Valores do orçamento inválidos.') {
    super('BUSINESS_RULE_VIOLATION', message, 422);
    this.name = 'InvalidQuoteMoneyError';
  }
}

export class QuoteNotSendableError extends AppError {
  constructor(status: string) {
    super(
      'INVALID_STATE_TRANSITION',
      'Orçamento só pode ser enviado em rascunho ou reenviado se ainda vigente.',
      409,
      { from: status, to: 'SENT' },
    );
    this.name = 'QuoteNotSendableError';
  }
}

export class QuoteExpiredError extends AppError {
  constructor() {
    super('INVALID_STATE_TRANSITION', 'Orçamento expirado.', 409, { to: 'EXPIRED' });
    this.name = 'QuoteExpiredError';
  }
}

export class QuotePdfPendingError extends AppError {
  constructor() {
    super('PDF_PENDING', 'PDF do orçamento ainda não está disponível.', 409);
    this.name = 'QuotePdfPendingError';
  }
}

export class QuoteCannotDuplicateError extends AppError {
  constructor(status: string) {
    super(
      'INVALID_STATE_TRANSITION',
      'Orçamento não pode ser duplicado neste status.',
      409,
      { from: status, to: 'DRAFT' },
    );
    this.name = 'QuoteCannotDuplicateError';
  }
}

export class QuoteNotDecidableError extends AppError {
  constructor(status: string) {
    super(
      'INVALID_STATE_TRANSITION',
      'Orçamento não aceita decisão neste status.',
      409,
      { from: status },
    );
    this.name = 'QuoteNotDecidableError';
  }
}

export class IdempotencyKeyReusedError extends AppError {
  constructor() {
    super('IDEMPOTENCY_KEY_REUSED', 'Idempotency-Key já usada com outro payload.', 409);
    this.name = 'IdempotencyKeyReusedError';
  }
}

export class IdempotencyKeyRequiredError extends AppError {
  constructor() {
    super('VALIDATION_ERROR', 'Header Idempotency-Key é obrigatório.', 400);
    this.name = 'IdempotencyKeyRequiredError';
  }
}

export class QuoteRejectReasonRequiredError extends AppError {
  constructor() {
    super('VALIDATION_ERROR', 'Motivo da rejeição deve ter ao menos 10 caracteres.', 400);
    this.name = 'QuoteRejectReasonRequiredError';
  }
}

export class GuardianRequiredError extends AppError {
  constructor() {
    super('GUARDIAN_REQUIRED', 'Cadastre o responsável legal antes da decisão pelo link.', 422);
    this.name = 'GuardianRequiredError';
  }
}

export class GuardianCpfMismatchError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'CPF do responsável não confere.', 422);
    this.name = 'GuardianCpfMismatchError';
  }
}

export class PublicQuoteTokenError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Link de orçamento inválido ou expirado.', 404);
    this.name = 'PublicQuoteTokenError';
  }
}

export class TreatmentPlanNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Plano de tratamento não encontrado.', 404);
    this.name = 'TreatmentPlanNotFoundError';
  }
}

export class TreatmentItemNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Item do plano não encontrado.', 404);
    this.name = 'TreatmentItemNotFoundError';
  }
}

export class ItemAlreadyExecutedError extends AppError {
  constructor() {
    super('ITEM_ALREADY_EXECUTED', 'Item já executado.', 409);
    this.name = 'ItemAlreadyExecutedError';
  }
}

export class ItemExecutedCancelError extends AppError {
  constructor() {
    super('ITEM_ALREADY_EXECUTED', 'Item executado não pode ser cancelado.', 422);
    this.name = 'ItemExecutedCancelError';
  }
}

export class ItemNotCancellableError extends AppError {
  constructor(status: string) {
    super(
      'INVALID_STATE_TRANSITION',
      'Item não pode ser cancelado neste status.',
      409,
      { from: status },
    );
    this.name = 'ItemNotCancellableError';
  }
}

export class ItemNotExecutableError extends AppError {
  constructor(status: string) {
    super(
      'INVALID_STATE_TRANSITION',
      'Item não pode ser executado neste status.',
      409,
      { from: status },
    );
    this.name = 'ItemNotExecutableError';
  }
}

export class ToothStateRequiredError extends AppError {
  constructor() {
    super(
      'BUSINESS_RULE_VIOLATION',
      'Informe toothState para este procedimento.',
      422,
    );
    this.name = 'ToothStateRequiredError';
  }
}

export class ExecuteBatchMismatchError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Itens do lote devem ser do mesmo paciente e plano.', 422);
    this.name = 'ExecuteBatchMismatchError';
  }
}

export class CancelReasonRequiredError extends AppError {
  constructor() {
    super('VALIDATION_ERROR', 'Motivo do cancelamento deve ter ao menos 10 caracteres.', 400);
    this.name = 'CancelReasonRequiredError';
  }
}

export class ExecuteCroRequiredError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Profissional sem CRO não pode executar item do plano.', 422);
    this.name = 'ExecuteCroRequiredError';
  }
}
