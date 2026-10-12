import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { TreatmentPlanController } from '../../controllers/treatment_plan.controller.js';

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
  authorize('quotes.read'),
];

export function buildTreatmentPlanRoutes(): Router {
  const router = Router();
  const controller = new TreatmentPlanController();
  router.get('/', ...readStack, asyncHandler(controller.list));
  router.get('/:id', ...readStack, asyncHandler(controller.get));
  return router;
}
