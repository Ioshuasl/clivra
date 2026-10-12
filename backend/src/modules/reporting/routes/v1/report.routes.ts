import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { asyncSubscriptionGuard } from '../../../subscription/subscription_public.js';
import { ReportController } from '../../controllers/report.controller.js';

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
  asyncSubscriptionGuard(),
  authorize('reports.read'),
];

const financialStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  asyncSubscriptionGuard(),
  authorize('reports.financial'),
];

export function buildReportRoutes(): Router {
  const router = Router();
  const controller = new ReportController();
  router.get('/dashboard', ...readStack, asyncHandler(controller.getDashboard));
  router.get('/no-shows', ...financialStack, asyncHandler(controller.getNoShows));
  router.get('/revenue', ...financialStack, asyncHandler(controller.getRevenue));
  router.get('/procedures', ...readStack, asyncHandler(controller.getProcedures));
  // Export: reports.read na borda; service exige reports.financial quando o relatório for financeiro.
  router.post('/:report/export', ...readStack, asyncHandler(controller.createExport));
  return router;
}
