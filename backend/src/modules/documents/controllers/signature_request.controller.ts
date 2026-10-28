import type { Request, Response } from 'express';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import { clientIp } from '../../../shared/middlewares/rate_limit.middleware.js';
import { documentParamSchema } from '../schemas/document.schema.js';
import {
  documentSettingUpdateSchema,
  publicSignatureSignSchema,
  publicSignatureTokenParamSchema,
  signatureRequestCreateSchema,
} from '../schemas/signature_request.schema.js';
import { GetService as GetSettingService } from '../services/setting/document_setting_get.service.js';
import { UpdateService as UpdateSettingService } from '../services/setting/document_setting_update.service.js';
import { CreateService } from '../services/signature_request/signature_request_create.service.js';
import { PublicGetService } from '../services/signature_request/signature_request_public_get.service.js';
import { PublicSendCodeService } from '../services/signature_request/signature_request_public_send_code.service.js';
import { PublicSignService } from '../services/signature_request/signature_request_public_sign.service.js';

function requireCtx(req: Request) {
  if (!req.ctx) {
    throw new AppError('UNAUTHENTICATED', 'Token de acesso ausente.', 401);
  }
  return req.ctx;
}

function invalid(error: unknown): never {
  throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, error);
}

/** Lado da clínica: configuração do método e pedido de assinatura. */
export class SignatureRequestController {
  constructor(
    private readonly getSetting = new GetSettingService(),
    private readonly updateSetting = new UpdateSettingService(),
    private readonly createRequest = new CreateService(),
  ) {}

  getSettings = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    res.status(200).json({ data: await this.getSetting.execute(ctx) });
  };

  updateSettings = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = documentSettingUpdateSchema.safeParse(req.body);
    if (!parsed.success) invalid(parsed.error);
    res.status(200).json({ data: await this.updateSetting.execute(ctx, parsed.data) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = documentParamSchema.safeParse(req.params);
    const parsed = signatureRequestCreateSchema.safeParse(req.body ?? {});
    if (!params.success) invalid(params.error);
    if (!parsed.success) invalid(parsed.error);
    const result = await this.createRequest.execute(ctx, params.data.documentId, parsed.data, {
      ip: req.ip,
    });
    res.status(201).json({ data: result });
  };
}

/** Lado do paciente: link público (sem login). */
export class PublicSignatureController {
  constructor(
    private readonly publicGet = new PublicGetService(),
    private readonly publicSendCode = new PublicSendCodeService(),
    private readonly publicSign = new PublicSignService(),
  ) {}

  get = async (req: Request, res: Response): Promise<void> => {
    const params = publicSignatureTokenParamSchema.safeParse(req.params);
    if (!params.success) invalid(params.error);
    res.status(200).json({ data: await this.publicGet.execute(req.requestId, params.data.token) });
  };

  sendCode = async (req: Request, res: Response): Promise<void> => {
    const params = publicSignatureTokenParamSchema.safeParse(req.params);
    if (!params.success) invalid(params.error);
    res.status(200).json({ data: await this.publicSendCode.execute(req.requestId, params.data.token) });
  };

  sign = async (req: Request, res: Response): Promise<void> => {
    const params = publicSignatureTokenParamSchema.safeParse(req.params);
    const parsed = publicSignatureSignSchema.safeParse(req.body);
    if (!params.success) invalid(params.error);
    if (!parsed.success) invalid(parsed.error);
    const result = await this.publicSign.execute(req.requestId, params.data.token, parsed.data, {
      ip: clientIp(req),
      userAgent: req.header('user-agent') ?? undefined,
    });
    res.status(200).json({ data: result });
  };
}
