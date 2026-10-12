import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';

export class FinancialReportForbiddenError extends AppError {
  constructor() {
    super('FORBIDDEN', 'Relatório financeiro exige permissão reports.financial.', 403);
    this.name = 'FinancialReportForbiddenError';
  }
}

export class ReportScopeForbiddenError extends AppError {
  constructor(message = 'Relatório disponível somente para o próprio profissional.') {
    super('FORBIDDEN', message, 403);
    this.name = 'ReportScopeForbiddenError';
  }
}

export class ReportPeriodTooLongError extends AppError {
  constructor(maxDays = 366) {
    super(
      'BUSINESS_RULE_VIOLATION',
      `Período máximo de ${maxDays} dias excedido.`,
      422,
    );
    this.name = 'ReportPeriodTooLongError';
  }
}

export class ReportPeriodInvalidError extends AppError {
  constructor() {
    super('VALIDATION_ERROR', 'Período inválido: from deve ser ≤ to.', 400);
    this.name = 'ReportPeriodInvalidError';
  }
}

export class ExportNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Exportação não encontrada.', 404);
    this.name = 'ExportNotFoundError';
  }
}

export class ExportPeriodRequiredError extends AppError {
  constructor() {
    super('VALIDATION_ERROR', 'Período from/to é obrigatório para este relatório.', 400);
    this.name = 'ExportPeriodRequiredError';
  }
}
