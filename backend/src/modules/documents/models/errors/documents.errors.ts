import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';

export class DocumentTemplateNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Modelo de documento não encontrado.', 404);
    this.name = 'DocumentTemplateNotFoundError';
  }
}

export class DocumentNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Documento não encontrado.', 404);
    this.name = 'DocumentNotFoundError';
  }
}

export class DocumentPatientNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Paciente não encontrado.', 404);
    this.name = 'DocumentPatientNotFoundError';
  }
}

export class DocumentProfessionalRequiredError extends AppError {
  constructor() {
    super(
      'BUSINESS_RULE_VIOLATION',
      'Escolha o profissional responsável por este documento.',
      422,
    );
    this.name = 'DocumentProfessionalRequiredError';
  }
}

export class DocumentForbiddenKindError extends AppError {
  constructor() {
    super('FORBIDDEN', 'Você não tem permissão para este tipo de documento.', 403);
    this.name = 'DocumentForbiddenKindError';
  }
}

export class DocumentTemplateInactiveError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Este modelo está desativado.', 422);
    this.name = 'DocumentTemplateInactiveError';
  }
}

export class DocumentUnknownVariableError extends AppError {
  constructor(variables: string[]) {
    super(
      'BUSINESS_RULE_VIOLATION',
      `Campo automático desconhecido: ${variables.join(', ')}.`,
      422,
      { variables },
    );
    this.name = 'DocumentUnknownVariableError';
  }
}

export class DocumentAlreadyCancelledError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Este documento já está cancelado.', 422);
    this.name = 'DocumentAlreadyCancelledError';
  }
}

export class DocumentReasonRequiredError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'Informe o motivo (mínimo de 10 caracteres).', 422);
    this.name = 'DocumentReasonRequiredError';
  }
}

export class DocumentSupersedeInvalidError extends AppError {
  constructor() {
    super(
      'BUSINESS_RULE_VIOLATION',
      'Só é possível corrigir um documento do mesmo paciente que não esteja cancelado.',
      422,
    );
    this.name = 'DocumentSupersedeInvalidError';
  }
}

export class DocumentPdfPendingError extends AppError {
  constructor() {
    super('PDF_PENDING', 'O PDF deste documento ainda não está disponível.', 409);
    this.name = 'DocumentPdfPendingError';
  }
}

export class CertificateNotProfessionalError extends AppError {
  constructor() {
    super(
      'BUSINESS_RULE_VIOLATION',
      'Só quem está cadastrado como profissional pode usar certificado digital.',
      422,
    );
    this.name = 'CertificateNotProfessionalError';
  }
}

export class CertificateNotFoundError extends AppError {
  constructor() {
    super(
      'CERTIFICATE_REQUIRED',
      'Cadastre o seu certificado digital em Configurações → Documentos antes de assinar.',
      422,
    );
    this.name = 'CertificateNotFoundError';
  }
}

export class CertificateInvalidFileError extends AppError {
  constructor() {
    super(
      'CERTIFICATE_INVALID',
      'Não foi possível ler este arquivo. Envie o certificado A1 (.pfx ou .p12).',
      422,
    );
    this.name = 'CertificateInvalidFileError';
  }
}

export class CertificateWrongPasswordError extends AppError {
  constructor() {
    super('CERTIFICATE_WRONG_PASSWORD', 'Senha do certificado incorreta.', 422);
    this.name = 'CertificateWrongPasswordError';
  }
}

export class CertificateExpiredError extends AppError {
  constructor() {
    super('CERTIFICATE_EXPIRED', 'Este certificado está vencido.', 422);
    this.name = 'CertificateExpiredError';
  }
}

export class DocumentSignForbiddenError extends AppError {
  constructor() {
    super('FORBIDDEN', 'Só o dentista responsável por este documento pode assiná-lo.', 403);
    this.name = 'DocumentSignForbiddenError';
  }
}

export class DocumentSignNotAllowedError extends AppError {
  constructor(message = 'Este documento não usa assinatura do dentista.') {
    super('BUSINESS_RULE_VIOLATION', message, 422);
    this.name = 'DocumentSignNotAllowedError';
  }
}

export class DocumentAlreadySignedError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'O dentista já assinou este documento.', 422);
    this.name = 'DocumentAlreadySignedError';
  }
}

export class SignatureLinkNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Este link de assinatura não existe ou já expirou.', 404);
    this.name = 'SignatureLinkNotFoundError';
  }
}

export class SignatureNotRequestedError extends AppError {
  constructor(message = 'Este documento não pede assinatura do paciente.') {
    super('BUSINESS_RULE_VIOLATION', message, 422);
    this.name = 'SignatureNotRequestedError';
  }
}

export class SignatureNoChannelError extends AppError {
  constructor() {
    super(
      'NO_CHANNEL',
      'Não foi possível enviar o código: a clínica não tem WhatsApp conectado e o paciente não tem e-mail. Fale com a clínica.',
      422,
    );
    this.name = 'SignatureNoChannelError';
  }
}

export class SignatureCodeRequiredError extends AppError {
  constructor() {
    super('CODE_REQUIRED', 'Digite o código de 6 dígitos que enviamos para você.', 422);
    this.name = 'SignatureCodeRequiredError';
  }
}

export class SignatureCodeInvalidError extends AppError {
  constructor(attemptsLeft: number) {
    super('CODE_INVALID', 'Código incorreto. Confira e tente de novo.', 422, { attemptsLeft });
    this.name = 'SignatureCodeInvalidError';
  }
}

export class SignatureCodeExpiredError extends AppError {
  constructor() {
    super('CODE_EXPIRED', 'O código venceu. Peça um código novo.', 422);
    this.name = 'SignatureCodeExpiredError';
  }
}

export class SignatureTooManyAttemptsError extends AppError {
  constructor() {
    super('TOO_MANY_ATTEMPTS', 'Muitas tentativas erradas. Peça um código novo.', 429);
    this.name = 'SignatureTooManyAttemptsError';
  }
}

export class QuoteContractTemplateMissingError extends AppError {
  constructor() {
    super(
      'QUOTE_CONTRACT_TEMPLATE_MISSING',
      'Escolha o modelo de contrato do orçamento em Configurações → Documentos.',
      422,
    );
    this.name = 'QuoteContractTemplateMissingError';
  }
}

export class QuoteContractTemplateInvalidError extends AppError {
  constructor() {
    super('BUSINESS_RULE_VIOLATION', 'O modelo escolhido precisa ser um contrato ativo.', 422);
    this.name = 'QuoteContractTemplateInvalidError';
  }
}
