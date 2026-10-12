import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { InstallmentController } from '../../controllers/installment.controller.js';

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

export function buildInstallmentRoutes(): Router {
  const router = Router();
  const controller = new InstallmentController();
  router.get('/', ...readStack, asyncHandler(controller.list));
  router.post('/:id/payments', ...writeStack, asyncHandler(controller.createPayment));
  router.post('/:id/charge', ...writeStack, asyncHandler(controller.charge));
  return router;
}
