import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize, authorizeAny } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { AnamnesisFormController } from '../../controllers/anamnesis_form.controller.js';

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

export function buildAnamnesisFormRoutes(): Router {
  const router = Router();
  const controller = new AnamnesisFormController();

  router.get(
    '/',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    authorizeAny('clinical_records.read', 'settings.read'),
    asyncHandler(controller.list),
  );

  router.post(
    '/',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    authorize('settings.write'),
    asyncHandler(controller.create),
  );

  return router;
}
