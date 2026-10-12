import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { CashSessionController } from '../../controllers/cash_session.controller.js';

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

const readStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('finance.read'),
];

const writeStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('finance.write'),
];

const closeStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('finance.close_cash'),
];

export function buildCashSessionRoutes(): Router {
  const router = Router();
  const controller = new CashSessionController();
  router.get('/current', ...readStack, asyncHandler(controller.current));
  router.post('/', ...writeStack, asyncHandler(controller.create));
  router.get('/:id', ...readStack, asyncHandler(controller.get));
  router.post('/:id/close', ...closeStack, asyncHandler(controller.close));
  router.post('/:id/movements', ...writeStack, asyncHandler(controller.createMovement));
  return router;
}
