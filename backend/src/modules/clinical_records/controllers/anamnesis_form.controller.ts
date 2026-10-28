import type { Request, Response } from 'express';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import {
  anamnesisFormAssignmentParamSchema,
  anamnesisFormAssignmentSetSchema,
  anamnesisFormCreateSchema,
  anamnesisFormResolveQuerySchema,
} from '../schemas/anamnesis_form.schema.js';
import { ListAssignmentService } from '../services/anamnesis_form/anamnesis_form_assignment_list.service.js';
import { SetAssignmentService } from '../services/anamnesis_form/anamnesis_form_assignment_set.service.js';
import { ResolveService } from '../services/anamnesis_form/anamnesis_form_resolve.service.js';
import { ListService } from '../services/anamnesis_form/anamnesis_form_list.service.js';
import { CreateService } from '../services/anamnesis_form/anamnesis_form_create.service.js';

function requireCtx(req: Request) {
  if (!req.ctx) {
    throw new AppError('UNAUTHENTICATED', 'Token de acesso ausente.', 401);
  }
  return req.ctx;
}

export class AnamnesisFormController {
  constructor(
    private readonly listForms = new ListService(),
    private readonly createForm = new CreateService(),
    private readonly listAssignments = new ListAssignmentService(),
    private readonly setAssignment = new SetAssignmentService(),
    private readonly resolveForm = new ResolveService(),
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const result = await this.listForms.execute(ctx);
    res.status(200).json({ data: result });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = anamnesisFormCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const form = await this.createForm.execute(ctx, parsed.data);
    res.status(201).json({ data: form });
  };

  resolve = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const query = anamnesisFormResolveQuerySchema.safeParse(req.query);
    if (!query.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, query.error);
    }
    const form = await this.resolveForm.execute(ctx, query.data.professionalId);
    res.status(200).json({ data: form });
  };

  listAssignment = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    res.status(200).json({ data: await this.listAssignments.execute(ctx) });
  };

  setAssignmentFor = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = anamnesisFormAssignmentParamSchema.safeParse(req.params);
    const parsed = anamnesisFormAssignmentSetSchema.safeParse(req.body);
    if (!params.success || !parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error ?? parsed.error);
    }
    await this.setAssignment.execute(ctx, params.data.professionalId, parsed.data);
    res.status(200).json({ data: { professionalId: params.data.professionalId, formName: parsed.data.formName } });
  };
}
