import type { Request, Response } from 'express';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import {
  treatmentItemBatchExecuteSchema,
  treatmentItemCancelSchema,
  treatmentItemCreateSchema,
  treatmentItemExecuteSchema,
  treatmentItemIdParamSchema,
} from '../schemas/treatment.schema.js';
import { ExecuteService } from '../services/treatment_item/treatment_item_execute.service.js';
import { ExecuteBatchService } from '../services/treatment_item/treatment_item_execute_batch.service.js';
import { CreateService } from '../services/treatment_item/treatment_item_create.service.js';
import { CancelService } from '../services/treatment_item/treatment_item_cancel.service.js';

function requireCtx(req: Request) {
  if (!req.ctx) {
    throw new AppError('UNAUTHENTICATED', 'Token de acesso ausente.', 401);
  }
  return req.ctx;
}

export class TreatmentItemController {
  constructor(
    private readonly executeOne = new ExecuteService(),
    private readonly executeBatch = new ExecuteBatchService(),
    private readonly cancelItem = new CancelService(),
    private readonly createItem = new CreateService(),
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = treatmentItemCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.createItem.execute(ctx, parsed.data);
    res.status(201).json({ data: result });
  };

  execute = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = treatmentItemIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const parsed = treatmentItemExecuteSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.executeOne.execute(ctx, params.data.id, parsed.data);
    res.status(200).json({ data: result });
  };

  executeMany = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = treatmentItemBatchExecuteSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.executeBatch.execute(ctx, parsed.data);
    res.status(200).json({ data: result });
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = treatmentItemIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const parsed = treatmentItemCancelSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.cancelItem.execute(ctx, params.data.id, parsed.data);
    res.status(200).json({ data: result });
  };
}
