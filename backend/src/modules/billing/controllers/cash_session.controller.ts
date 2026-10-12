import type { Request, Response } from 'express';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import {
  cashMovementCreateSchema,
  cashSessionCloseSchema,
  cashSessionCreateSchema,
  cashSessionCurrentQuerySchema,
  cashSessionIdParamSchema,
} from '../schemas/billing.schema.js';
import { OpenService } from '../services/cash_session/cash_session_open.service.js';
import { GetCurrentService } from '../services/cash_session/cash_session_get_current.service.js';
import { GetService } from '../services/cash_session/cash_session_get.service.js';
import { CloseService } from '../services/cash_session/cash_session_close.service.js';
import { CreateService as CreateMovementService } from '../services/cash_movement/cash_movement_create.service.js';

function requireCtx(req: Request) {
  if (!req.ctx) {
    throw new AppError('UNAUTHENTICATED', 'Token de acesso ausente.', 401);
  }
  return req.ctx;
}

export class CashSessionController {
  constructor(
    private readonly openSession = new OpenService(),
    private readonly getCurrent = new GetCurrentService(),
    private readonly getSession = new GetService(),
    private readonly closeSession = new CloseService(),
    private readonly movementCreate = new CreateMovementService(),
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = cashSessionCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const idempotencyKey = req.header('idempotency-key') ?? req.header('Idempotency-Key');
    const result = await this.openSession.execute(ctx, parsed.data, idempotencyKey);
    res.status(201).json({ data: result });
  };

  current = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = cashSessionCurrentQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.getCurrent.execute(ctx, parsed.data.unitId);
    res.status(200).json({ data: result });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = cashSessionIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const result = await this.getSession.execute(ctx, params.data.id);
    res.status(200).json({ data: result });
  };

  close = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = cashSessionIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const parsed = cashSessionCloseSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const idempotencyKey = req.header('idempotency-key') ?? req.header('Idempotency-Key');
    const result = await this.closeSession.execute(ctx, params.data.id, parsed.data, idempotencyKey);
    res.status(200).json({ data: result });
  };

  createMovement = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = cashSessionIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const parsed = cashMovementCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.movementCreate.execute(ctx, params.data.id, parsed.data);
    res.status(201).json({ data: result });
  };
}
