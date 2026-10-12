import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';

export class PeriodTooLongError extends AppError {
  constructor(maxDays: number) {
    super(
      'PERIOD_TOO_LONG',
      `Período máximo de ${maxDays} dias. Reduza o intervalo ou exporte o relatório.`,
      422,
    );
    this.name = 'PeriodTooLongError';
  }
}

export class PeriodInvalidError extends AppError {
  constructor() {
    super('PERIOD_INVALID', 'Data inicial não pode ser posterior à data final.', 422);
    this.name = 'PeriodInvalidError';
  }
}

export class ReportScopeForbiddenError extends AppError {
  constructor() {
    super('FORBIDDEN', 'Relatório disponível somente para o próprio profissional.', 403);
    this.name = 'ReportScopeForbiddenError';
  }
}

export class ExportNotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'Exportação não encontrada.', 404);
    this.name = 'ExportNotFoundError';
  }
}

export class ExportFormatNotSupportedError extends AppError {
  constructor() {
    super('NOT_IMPLEMENTED', 'Formato XLSX ainda não disponível. Use CSV.', 501);
    this.name = 'ExportFormatNotSupportedError';
  }
}

export class ReportExportForbiddenError extends AppError {
  constructor() {
    super('FORBIDDEN', 'Permissão insuficiente para exportar este relatório.', 403);
    this.name = 'ReportExportForbiddenError';
  }
}

export class UnknownExportReportError extends AppError {
  constructor() {
    super('VALIDATION_ERROR', 'Relatório de exportação inválido.', 400);
    this.name = 'UnknownExportReportError';
  }
}
