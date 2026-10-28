import type { Request, Response } from 'express';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import {
  documentTemplateCreateSchema,
  documentTemplateListQuerySchema,
  documentTemplateParamSchema,
  documentTemplatePreviewSchema,
  documentTemplateUpdateSchema,
} from '../schemas/document_template.schema.js';
import { CreateService } from '../services/document_template/document_template_create.service.js';
import { DeleteService } from '../services/document_template/document_template_delete.service.js';
import { GetService } from '../services/document_template/document_template_get.service.js';
import { ListService } from '../services/document_template/document_template_list.service.js';
import { PreviewService } from '../services/document_template/document_template_preview.service.js';
import { UpdateService } from '../services/document_template/document_template_update.service.js';

function requireCtx(req: Request) {
  if (!req.ctx) {
    throw new AppError('UNAUTHENTICATED', 'Token de acesso ausente.', 401);
  }
  return req.ctx;
}

function invalid(error: unknown): never {
  throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, error);
}

export class DocumentTemplateController {
  constructor(
    private readonly listTemplates = new ListService(),
    private readonly getTemplate = new GetService(),
    private readonly createTemplate = new CreateService(),
    private readonly updateTemplate = new UpdateService(),
    private readonly deleteTemplate = new DeleteService(),
    private readonly previewTemplate = new PreviewService(),
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const query = documentTemplateListQuerySchema.safeParse(req.query);
    if (!query.success) invalid(query.error);
    res.status(200).json({ data: await this.listTemplates.execute(ctx, query.data) });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = documentTemplateParamSchema.safeParse(req.params);
    if (!params.success) invalid(params.error);
    res.status(200).json({ data: await this.getTemplate.execute(ctx, params.data.templateId) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = documentTemplateCreateSchema.safeParse(req.body);
    if (!parsed.success) invalid(parsed.error);
    res.status(201).json({ data: await this.createTemplate.execute(ctx, parsed.data) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = documentTemplateParamSchema.safeParse(req.params);
    const parsed = documentTemplateUpdateSchema.safeParse(req.body);
    if (!params.success) invalid(params.error);
    if (!parsed.success) invalid(parsed.error);
    res.status(200).json({
      data: await this.updateTemplate.execute(ctx, params.data.templateId, parsed.data),
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = documentTemplateParamSchema.safeParse(req.params);
    if (!params.success) invalid(params.error);
    await this.deleteTemplate.execute(ctx, params.data.templateId);
    res.status(204).send();
  };

  preview = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = documentTemplateParamSchema.safeParse(req.params);
    const parsed = documentTemplatePreviewSchema.safeParse(req.body);
    if (!params.success) invalid(params.error);
    if (!parsed.success) invalid(parsed.error);
    res.status(200).json({
      data: await this.previewTemplate.execute(ctx, params.data.templateId, parsed.data),
    });
  };
}
