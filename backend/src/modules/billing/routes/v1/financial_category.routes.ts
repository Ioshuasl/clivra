import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { FinancialCategoryController } from '../../controllers/financial_category.controller.js';

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

export function buildFinancialCategoryRoutes(): Router {
  const router = Router();
  const controller = new FinancialCategoryController();
  router.get('/', ...readStack, asyncHandler(controller.list));
  router.post('/', ...writeStack, asyncHandler(controller.create));
  return router;
}
