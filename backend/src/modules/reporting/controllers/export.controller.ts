import type { Request, Response } from 'express';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import { exportIdParamSchema } from '../schemas/reporting.schema.js';
import { GetService } from '../services/export/report_export_get.service.js';

function requireCtx(req: Request) {
  if (!req.ctx) {
    throw new AppError('UNAUTHENTICATED', 'Token de acesso ausente.', 401);
  }
  return req.ctx;
}

export class ExportController {
  constructor(private readonly getExport = new GetService()) {}

  get = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = exportIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const result = await this.getExport.execute(ctx, params.data.id);
    res.status(200).json({ data: result });
  };
}
