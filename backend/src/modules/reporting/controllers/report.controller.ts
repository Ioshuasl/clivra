import type { Request, Response } from 'express';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import {
  dashboardQuerySchema,
  exportCreateBodySchema,
  exportReportParamSchema,
  noShowsQuerySchema,
  proceduresQuerySchema,
  revenueQuerySchema,
} from '../schemas/reporting.schema.js';
import { CreateService as ExportCreateService } from '../services/export/report_export_create.service.js';
import { GetService as DashboardGetService } from '../services/report/dashboard_get.service.js';
import { GetService as NoShowsGetService } from '../services/report/no_shows_get.service.js';
import { GetService as ProceduresGetService } from '../services/report/procedures_get.service.js';
import { GetService as RevenueGetService } from '../services/report/revenue_get.service.js';

function requireCtx(req: Request) {
  if (!req.ctx) {
    throw new AppError('UNAUTHENTICATED', 'Token de acesso ausente.', 401);
  }
  return req.ctx;
}

export class ReportController {
  constructor(
    private readonly dashboard = new DashboardGetService(),
    private readonly noShows = new NoShowsGetService(),
    private readonly revenue = new RevenueGetService(),
    private readonly procedures = new ProceduresGetService(),
    private readonly exportCreate = new ExportCreateService(),
  ) {}

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = dashboardQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.dashboard.execute(ctx, parsed.data);
    res.status(200).json({ data: result });
  };

  getNoShows = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = noShowsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.noShows.execute(ctx, parsed.data);
    res.status(200).json({ data: result });
  };

  getRevenue = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = revenueQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.revenue.execute(ctx, parsed.data);
    res.status(200).json({ data: result });
  };

  getProcedures = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = proceduresQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.procedures.execute(ctx, parsed.data);
    res.status(200).json({ data: result });
  };

  createExport = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = exportReportParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('NOT_FOUND', 'Relatório não encontrado.', 404);
    }
    const body = exportCreateBodySchema.safeParse(req.body);
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, body.error);
    }
    const result = await this.exportCreate.execute(ctx, params.data.report, body.data);
    res.status(202).json({ data: result });
  };
}
