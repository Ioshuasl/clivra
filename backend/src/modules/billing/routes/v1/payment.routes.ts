import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { PaymentController } from '../../controllers/payment.controller.js';

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

export function buildPaymentRoutes(): Router {
  const router = Router();
  const controller = new PaymentController();
  router.get('/:id/receipt', ...readStack, asyncHandler(controller.getReceipt));
  router.post('/:id/send-receipt', ...writeStack, asyncHandler(controller.sendReceiptToPatient));
  router.post('/:id/reverse', ...writeStack, asyncHandler(controller.reverse));
  return router;
}
