import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { TreatmentItemController } from '../../controllers/treatment_item.controller.js';

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

const clinicalWriteStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('clinical_records.write'),
];

export function buildTreatmentItemRoutes(): Router {
  const router = Router();
  const controller = new TreatmentItemController();
  router.post('/execute', ...clinicalWriteStack, asyncHandler(controller.executeMany));
  router.post('/:id/execute', ...clinicalWriteStack, asyncHandler(controller.execute));
  router.post('/:id/cancel', ...clinicalWriteStack, asyncHandler(controller.cancel));
  return router;
}
