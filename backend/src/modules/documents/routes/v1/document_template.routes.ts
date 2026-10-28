import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize, authorizeAny } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { asyncSubscriptionGuard } from '../../../subscription/subscription_public.js';
import { DocumentTemplateController } from '../../controllers/document_template.controller.js';

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

export function buildDocumentTemplateRoutes(): Router {
  const router = Router();
  const controller = new DocumentTemplateController();

  const readers = authorizeAny('patients.read', 'clinical_records.read', 'settings.read');

  router.get(
    '/',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    readers,
    asyncHandler(controller.list),
  );

  router.get(
    '/:templateId',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    readers,
    asyncHandler(controller.get),
  );

  router.post(
    '/:templateId/preview',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    readers,
    asyncHandler(controller.preview),
  );

  router.post(
    '/',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    asyncSubscriptionGuard(),
    authorize('settings.write'),
    asyncHandler(controller.create),
  );

  router.patch(
    '/:templateId',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    asyncSubscriptionGuard(),
    authorize('settings.write'),
    asyncHandler(controller.update),
  );

  router.delete(
    '/:templateId',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    asyncSubscriptionGuard(),
    authorize('settings.write'),
    asyncHandler(controller.delete),
  );

  return router;
}
