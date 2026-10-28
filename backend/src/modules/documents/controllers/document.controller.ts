import type { Request, Response } from 'express';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import {
  documentCancelSchema,
  documentCreateSchema,
  documentParamSchema,
  documentPatientParamSchema,
} from '../schemas/document.schema.js';
import { documentSignSchema } from '../schemas/certificate.schema.js';
import { SignService } from '../services/document/document_sign.service.js';
import { CancelService } from '../services/document/document_cancel.service.js';
import { CreateService } from '../services/document/document_create.service.js';
import { GetService } from '../services/document/document_get.service.js';
import { ListService } from '../services/document/document_list.service.js';
import { PdfService } from '../services/document/document_pdf.service.js';

function requireCtx(req: Request) {
  if (!req.ctx) {
    throw new AppError('UNAUTHENTICATED', 'Token de acesso ausente.', 401);
  }
  return req.ctx;
}

function invalid(error: unknown): never {
  throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, error);
}

export class DocumentController {
  constructor(
    private readonly listDocuments = new ListService(),
    private readonly getDocument = new GetService(),
    private readonly createDocument = new CreateService(),
    private readonly cancelDocument = new CancelService(),
    private readonly pdfDocument = new PdfService(),
    private readonly signDocument = new SignService(),
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = documentPatientParamSchema.safeParse(req.params);
    if (!params.success) invalid(params.error);
    res.status(200).json({ data: await this.listDocuments.execute(ctx, params.data.patientId) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = documentPatientParamSchema.safeParse(req.params);
    const parsed = documentCreateSchema.safeParse(req.body);
    if (!params.success) invalid(params.error);
    if (!parsed.success) invalid(parsed.error);
    const document = await this.createDocument.execute(ctx, params.data.patientId, parsed.data, {
      ip: req.ip,
    });
    res.status(201).json({ data: document });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = documentParamSchema.safeParse(req.params);
    if (!params.success) invalid(params.error);
    res.status(200).json({ data: await this.getDocument.execute(ctx, params.data.documentId) });
  };

  pdf = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = documentParamSchema.safeParse(req.params);
    if (!params.success) invalid(params.error);
    res.status(200).json({ data: await this.pdfDocument.execute(ctx, params.data.documentId) });
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = documentParamSchema.safeParse(req.params);
    const parsed = documentCancelSchema.safeParse(req.body);
    if (!params.success) invalid(params.error);
    if (!parsed.success) invalid(parsed.error);
    const document = await this.cancelDocument.execute(ctx, params.data.documentId, parsed.data, {
      ip: req.ip,
    });
    res.status(200).json({ data: document });
  };

  sign = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = documentParamSchema.safeParse(req.params);
    const parsed = documentSignSchema.safeParse(req.body);
    if (!params.success) invalid(params.error);
    if (!parsed.success) invalid(parsed.error);
    const document = await this.signDocument.execute(ctx, params.data.documentId, parsed.data, {
      ip: req.ip,
    });
    res.status(200).json({ data: document });
  };
}
