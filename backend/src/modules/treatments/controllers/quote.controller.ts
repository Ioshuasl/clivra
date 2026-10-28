import type { Request, Response } from 'express';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import {
  quoteCreateSchema,
  quoteIdParamSchema,
  quoteItemCreateSchema,
  quoteItemIdParamSchema,
  quoteListQuerySchema,
  quoteSendSchema,
  quoteUpdateSchema,
  quoteDecisionSchema,
} from '../schemas/quote.schema.js';
import { CreateService as QuoteCreateService } from '../services/quote/quote_create.service.js';
import { ListService as QuoteListService } from '../services/quote/quote_list.service.js';
import { GetService as QuoteGetService } from '../services/quote/quote_get.service.js';
import { UpdateService as QuoteUpdateService } from '../services/quote/quote_update.service.js';
import { CreateService as ItemCreateService } from '../services/quote/item_create.service.js';
import { DeleteService as ItemDeleteService } from '../services/quote/item_delete.service.js';
import { SendService } from '../services/quote/quote_send.service.js';
import { DuplicateService } from '../services/quote/quote_duplicate.service.js';
import { GetPdfService } from '../services/quote/quote_pdf.service.js';
import { DecideService } from '../services/quote/quote_decide.service.js';
import { ContractService } from '../services/quote/quote_contract.service.js';

function requireCtx(req: Request) {
  if (!req.ctx) {
    throw new AppError('UNAUTHENTICATED', 'Token de acesso ausente.', 401);
  }
  return req.ctx;
}

export class QuoteController {
  constructor(
    private readonly quoteCreate = new QuoteCreateService(),
    private readonly quoteList = new QuoteListService(),
    private readonly quoteGet = new QuoteGetService(),
    private readonly quoteUpdate = new QuoteUpdateService(),
    private readonly itemCreate = new ItemCreateService(),
    private readonly itemDelete = new ItemDeleteService(),
    private readonly quoteSend = new SendService(),
    private readonly quoteDuplicate = new DuplicateService(),
    private readonly quotePdf = new GetPdfService(),
    private readonly quoteDecide = new DecideService(),
    private readonly quoteContract = new ContractService(),
  ) {}

  contract = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = quoteIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const result = await this.quoteContract.execute(ctx, params.data.id);
    res.status(result.created ? 201 : 200).json({ data: result });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = quoteListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.quoteList.execute(ctx, parsed.data);
    res.status(200).json({ data: result.items, meta: { nextCursor: result.nextCursor } });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = quoteCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.quoteCreate.execute(ctx, parsed.data);
    res.status(201).json({ data: result });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = quoteIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const result = await this.quoteGet.execute(ctx, params.data.id);
    res.status(200).json({ data: result });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = quoteIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const parsed = quoteUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.quoteUpdate.execute(ctx, params.data.id, parsed.data);
    res.status(200).json({ data: result });
  };

  createItem = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = quoteIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const parsed = quoteItemCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.itemCreate.execute(ctx, params.data.id, parsed.data);
    res.status(201).json({ data: result });
  };

  deleteItem = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = quoteItemIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const result = await this.itemDelete.execute(ctx, params.data.id, params.data.itemId);
    res.status(200).json({ data: result });
  };

  send = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = quoteIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const parsed = quoteSendSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.quoteSend.execute(ctx, params.data.id, parsed.data);
    res.status(200).json({ data: result });
  };

  duplicate = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = quoteIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const result = await this.quoteDuplicate.execute(ctx, params.data.id);
    res.status(201).json({ data: result });
  };

  getPdf = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = quoteIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const result = await this.quotePdf.execute(ctx, params.data.id);
    res.status(200).json({ data: result });
  };

  decide = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = quoteIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const parsed = quoteDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const idempotencyKey = req.header('idempotency-key') ?? req.header('Idempotency-Key');
    const result = await this.quoteDecide.execute(ctx, params.data.id, parsed.data, idempotencyKey);
    res.status(200).json({ data: result });
  };
}
