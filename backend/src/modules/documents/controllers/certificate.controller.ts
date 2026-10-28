import type { Request, Response } from 'express';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import { certificateUploadSchema } from '../schemas/certificate.schema.js';
import { DeleteService } from '../services/certificate/certificate_delete.service.js';
import { GetService } from '../services/certificate/certificate_get.service.js';
import { UpdateService } from '../services/certificate/certificate_update.service.js';

function requireCtx(req: Request) {
  if (!req.ctx) {
    throw new AppError('UNAUTHENTICATED', 'Token de acesso ausente.', 401);
  }
  return req.ctx;
}

export class CertificateController {
  constructor(
    private readonly getCertificate = new GetService(),
    private readonly updateCertificate = new UpdateService(),
    private readonly deleteCertificate = new DeleteService(),
  ) {}

  get = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    res.status(200).json({ data: await this.getCertificate.execute(ctx) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = certificateUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const certificate = await this.updateCertificate.execute(ctx, parsed.data, { ip: req.ip });
    res.status(200).json({ data: certificate });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    await this.deleteCertificate.execute(ctx, { ip: req.ip });
    res.status(204).send();
  };
}
