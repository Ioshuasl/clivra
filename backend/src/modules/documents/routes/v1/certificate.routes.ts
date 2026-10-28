import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { rateLimit } from '../../../../shared/middlewares/rate_limit.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { asyncSubscriptionGuard } from '../../../subscription/subscription_public.js';
import { CertificateController } from '../../controllers/certificate.controller.js';

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

/** Certificado A1 do próprio usuário (`/document-certificates/me`). */
export function buildCertificateRoutes(): Router {
  const router = Router();
  const controller = new CertificateController();
  // Senha de certificado: limita tentativas por usuário (em produção).
  const limit = rateLimit({ windowMs: 60_000, max: 10, key: (req) => `certificate:${req.auth?.userId ?? req.ip}` });

  router.get(
    '/me',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    authorize('clinical_records.read'),
    asyncHandler(controller.get),
  );

  router.put(
    '/me',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    asyncSubscriptionGuard(),
    authorize('clinical_records.write'),
    limit,
    asyncHandler(controller.update),
  );

  router.delete(
    '/me',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    asyncSubscriptionGuard(),
    authorize('clinical_records.write'),
    asyncHandler(controller.delete),
  );

  return router;
}
