import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { auditRead } from '../../../../shared/middlewares/audit_read.middleware.js';
import { authorizeAny } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { asyncSubscriptionGuard } from '../../../subscription/subscription_public.js';
import { rateLimit } from '../../../../shared/middlewares/rate_limit.middleware.js';
import { DocumentController } from '../../controllers/document.controller.js';

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

/** Rotas por paciente (`/patients/:patientId/documents`) e por documento (`/documents/:documentId`). */
export function buildDocumentRoutes(): Router {
  const router = Router();
  const controller = new DocumentController();

  // O tipo do documento define a permissão exata; o service confere por tipo.
  const readers = authorizeAny('patients.read', 'clinical_records.read');
  const writers = authorizeAny('patients.write', 'clinical_records.write');

  router.get(
    '/patients/:patientId/documents',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    readers,
    auditRead({ resourceType: 'document' }),
    asyncHandler(controller.list),
  );

  router.post(
    '/patients/:patientId/documents',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    asyncSubscriptionGuard(),
    writers,
    asyncHandler(controller.create),
  );

  router.get(
    '/documents/:documentId',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    readers,
    asyncHandler(controller.get),
  );

  router.get(
    '/documents/:documentId/pdf',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    readers,
    asyncHandler(controller.pdf),
  );

  router.post(
    '/documents/:documentId/cancel',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    asyncSubscriptionGuard(),
    writers,
    asyncHandler(controller.cancel),
  );

  router.post(
    '/documents/:documentId/sign',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    asyncSubscriptionGuard(),
    writers,
    rateLimit({ windowMs: 60_000, max: 10, key: (req) => `document-sign:${req.auth?.userId ?? req.ip}` }),
    asyncHandler(controller.sign),
  );

  return router;
}
