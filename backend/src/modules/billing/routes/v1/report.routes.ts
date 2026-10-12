import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { ReportController } from '../../controllers/report.controller.js';

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

const financialStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('reports.financial'),
];

const productionStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('reports.read'),
];

export function buildReportRoutes(): Router {
  const router = Router();
  const controller = new ReportController();
  router.get('/cash-flow', ...financialStack, asyncHandler(controller.getCashFlow));
  router.get('/overdue', ...financialStack, asyncHandler(controller.getOverdue));
  router.get('/production', ...productionStack, asyncHandler(controller.getProduction));
  return router;
}
