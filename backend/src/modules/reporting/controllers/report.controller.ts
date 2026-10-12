import type { Request, Response } from 'express';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import {
  dashboardQuerySchema,
  exportCreateSchema,
  exportReportParamSchema,
  noShowQuerySchema,
  procedureQuerySchema,
  revenueQuerySchema,
} from '../schemas/report.schema.js';
import { GetService as DashboardGetService } from '../services/dashboard/dashboard_get.service.js';
import { GetService as NoShowGetService } from '../services/no_show/no_show_get.service.js';
import { GetService as ProcedureGetService } from '../services/procedure/procedure_get.service.js';
import { GetService as RevenueGetService } from '../services/revenue/revenue_get.service.js';
import { CreateService as ExportCreateService } from '../services/export/export_create.service.js';

function requireCtx(req: Request) {
  if (!req.ctx) {
    throw new AppError('UNAUTHENTICATED', 'Token de acesso ausente.', 401);
  }
  return req.ctx;
}

export class ReportController {
  constructor(
    private readonly dashboard = new DashboardGetService(),
    private readonly noShows = new NoShowGetService(),
    private readonly revenue = new RevenueGetService(),
    private readonly procedures = new ProcedureGetService(),
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
    const parsed = noShowQuerySchema.safeParse(req.query);
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
    const parsed = procedureQuerySchema.safeParse(req.query);
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
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const parsed = exportCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.exportCreate.execute(ctx, params.data.report, parsed.data);
    res.status(202).json({ data: result });
  };
}
