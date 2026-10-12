import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize, authorizeAny } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { ProcedureController } from '../../controllers/procedure.controller.js';

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

const listStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorizeAny('settings.read', 'quotes.read', 'quotes.write'),
];

const writeStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('settings.write'),
];

export function buildProcedureRoutes(): Router {
  const router = Router();
  const controller = new ProcedureController();

  router.get('/', ...listStack, asyncHandler(controller.list));
  router.post('/', ...writeStack, asyncHandler(controller.create));
  router.patch('/:id', ...writeStack, asyncHandler(controller.update));
  router.post('/import-catalog', ...writeStack, asyncHandler(controller.importCatalog));

  return router;
}
