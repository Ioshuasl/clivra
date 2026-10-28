import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';

export class MedicalRecordNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Prontuário não encontrado.', 404);
    this.name = 'MedicalRecordNotFoundError';
  }
}

export class RecordImmutableError extends AppError {
  constructor(hint = 'Use POST .../notes/:id/amend para nova versão.') {
    super('RECORD_IMMUTABLE', 'Evolução clínica é imutável.', 423, { hint });
    this.name = 'RecordImmutableError';
  }
}

export class AnamnesisFormNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Formulário de anamnese não encontrado.', 404);
    this.name = 'AnamnesisFormNotFoundError';
  }
}

export class ProfessionalNotFoundForFormError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Profissional não encontrado.', 404);
    this.name = 'ProfessionalNotFoundForFormError';
  }
}

export class AnamnesisTokenNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Link inválido ou expirado.', 404);
    this.name = 'AnamnesisTokenNotFoundError';
  }
}

export class AnamnesisAnswersInvalidError extends AppError {
  constructor(details?: unknown) {
    super('BUSINESS_RULE_VIOLATION', 'Respostas da anamnese inválidas.', 422, details);
    this.name = 'AnamnesisAnswersInvalidError';
  }
}

export class ClinicalAlertNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Alerta clínico não encontrado.', 404);
    this.name = 'ClinicalAlertNotFoundError';
  }
}

export class CriticalAlertNotDismissableError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Alerta CRITICAL não pode ser dispensado.', 422);
    this.name = 'CriticalAlertNotDismissableError';
  }
}

export class PatientNotFoundForRecordError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Paciente não encontrado.', 404);
    this.name = 'PatientNotFoundForRecordError';
  }
}

export class InvalidToothCodeError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Código FDI ou dentição inválidos.', 422);
    this.name = 'InvalidToothCodeError';
  }
}

export class ToothStateConflictError extends AppError {
  constructor() {
    super(
      'TOOTH_STATE_CONFLICT',
      'Dente ausente/extraído não recebe restauração sem justificativa.',
      422,
      { justification: 'Informe justification com no mínimo 10 caracteres para forçar.' },
    );
    this.name = 'ToothStateConflictError';
  }
}

export class TreatmentItemIdsOnNoteError extends AppError {
  constructor() {
    super(
      'BUSINESS_RULE_VIOLATION',
      'Para executar item do plano use POST /api/v1/treatment-items/:id/execute.',
      422,
      { hint: '/api/v1/treatment-items/:id/execute' },
    );
    this.name = 'TreatmentItemIdsOnNoteError';
  }
}

export class ClinicalNoteTooShortError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Evolução deve ter no mínimo 10 caracteres.', 422);
    this.name = 'ClinicalNoteTooShortError';
  }
}

export class ProfessionalWithoutCroError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Profissional sem CRO não pode assinar evolução.', 422);
    this.name = 'ProfessionalWithoutCroError';
  }
}

export class AmendReasonRequiredError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Motivo do amend deve ter no mínimo 10 caracteres.', 422);
    this.name = 'AmendReasonRequiredError';
  }
}

export class ClinicalNoteNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Evolução não encontrada.', 404);
    this.name = 'ClinicalNoteNotFoundError';
  }
}

export class AppointmentNotLinkableError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Agendamento não pode ser vinculado a esta evolução.', 422);
    this.name = 'AppointmentNotLinkableError';
  }
}

export class UnsupportedAttachmentTypeError extends AppError {
  constructor() {
    super('UNSUPPORTED_MEDIA_TYPE', 'Tipo de arquivo não permitido.', 415);
    this.name = 'UnsupportedAttachmentTypeError';
  }
}

export class AttachmentTooLargeError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Arquivo excede o limite de 20 MB.', 422);
    this.name = 'AttachmentTooLargeError';
  }
}

export class PlanLimitExceededError extends AppError {
  constructor() {
    super('PLAN_LIMIT_EXCEEDED', 'Cota de armazenamento do plano esgotada.', 402);
    this.name = 'PlanLimitExceededError';
  }
}

export class StorageUnavailableError extends AppError {
  constructor() {
    super('STORAGE_UNAVAILABLE', 'Armazenamento indisponível.', 503);
    this.name = 'StorageUnavailableError';
  }
}

export class AttachmentNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Anexo não encontrado.', 404);
    this.name = 'AttachmentNotFoundError';
  }
}

export class AttachmentDeleteReasonError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Motivo da exclusão deve ter no mínimo 10 caracteres.', 422);
    this.name = 'AttachmentDeleteReasonError';
  }
}

export class InvalidStorageKeyError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'storageKey inválido para este paciente.', 422);
    this.name = 'InvalidStorageKeyError';
  }
}

export class AttachmentUploadMissingError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Upload não encontrado no storage.', 422);
    this.name = 'AttachmentUploadMissingError';
  }
}
