import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { MessagingController } from '../../controllers/messaging.controller.js';

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

const configureStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('messaging.configure'),
];

const readStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('messaging.read'),
];

export function buildMessagingRoutes(): Router {
  const router = Router();
  const controller = new MessagingController();

  router.get('/account', ...readStack, asyncHandler(controller.getAccount));
  router.get('/account/qr', ...readStack, asyncHandler(controller.getAccountQr));
  router.post('/account', ...configureStack, asyncHandler(controller.connectAccount));
  router.patch('/account', ...configureStack, asyncHandler(controller.patchAccount));
  router.delete('/account', ...configureStack, asyncHandler(controller.deleteAccount));
  router.post('/account/test', ...configureStack, asyncHandler(controller.testAccount));

  router.get('/templates', ...readStack, asyncHandler(controller.listTemplates));
  router.get('/automations', ...readStack, asyncHandler(controller.listAutomations));
  router.patch('/automations/:key', ...configureStack, asyncHandler(controller.patchAutomation));
  router.get('/usage', ...readStack, asyncHandler(controller.getUsage));
  router.get('/logs', ...readStack, asyncHandler(controller.listLogs));

  return router;
}
