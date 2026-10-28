import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize, authorizeAny } from '../../../../shared/middlewares/authorize.middleware.js';
import { clientIp, rateLimit } from '../../../../shared/middlewares/rate_limit.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { asyncSubscriptionGuard } from '../../../subscription/subscription_public.js';
import {
  PublicSignatureController,
  SignatureRequestController,
} from '../../controllers/signature_request.controller.js';

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

/** Configuração do método de assinatura do paciente (`/document-settings`). */
export function buildDocumentSettingRoutes(): Router {
  const router = Router();
  const controller = new SignatureRequestController();

  router.get(
    '/',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    authorizeAny('patients.read', 'clinical_records.read', 'settings.read'),
    asyncHandler(controller.getSettings),
  );

  router.put(
    '/',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    asyncSubscriptionGuard(),
    authorize('settings.write'),
    asyncHandler(controller.updateSettings),
  );

  return router;
}

/** Pedido de assinatura do paciente, feito pela clínica. */
export function buildSignatureRequestRoutes(): Router {
  const router = Router();
  const controller = new SignatureRequestController();

  router.post(
    '/documents/:documentId/signature-requests',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    asyncSubscriptionGuard(),
    authorizeAny('patients.write', 'clinical_records.write'),
    asyncHandler(controller.create),
  );

  return router;
}

/** Link público do paciente (`/public/document-signatures/:token`). */
export function buildPublicSignatureRoutes(): Router {
  const router = Router();
  const controller = new PublicSignatureController();
  const limit = rateLimit({
    windowMs: 60 * 60_000,
    max: 60,
    key: (req) => `public:document-signature:ip:${clientIp(req)}`,
  });
  // O envio do código custa mensagem: limite mais apertado.
  const codeLimit = rateLimit({
    windowMs: 60 * 60_000,
    max: 10,
    key: (req) => `public:document-signature-code:ip:${clientIp(req)}`,
  });

  router.get('/document-signatures/:token', limit, asyncHandler(controller.get));
  router.post('/document-signatures/:token/code', codeLimit, asyncHandler(controller.sendCode));
  router.post('/document-signatures/:token/sign', limit, asyncHandler(controller.sign));

  return router;
}
