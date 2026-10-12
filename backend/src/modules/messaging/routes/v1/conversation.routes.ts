import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { asyncSubscriptionGuard } from '../../../subscription/subscription_public.js';
import { ConversationController } from '../../controllers/conversation.controller.js';

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
  authorize('messaging.read'),
];

const writeStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  asyncSubscriptionGuard(),
  authorize('messaging.write'),
];

export function buildConversationRoutes(): Router {
  const router = Router();
  const controller = new ConversationController();

  router.get('/conversations', ...readStack, asyncHandler(controller.list));
  router.get('/conversations/:id', ...readStack, asyncHandler(controller.get));
  router.patch('/conversations/:id', ...writeStack, asyncHandler(controller.update));
  router.post('/conversations/:id/read', ...writeStack, asyncHandler(controller.markAsRead));
  router.get('/conversations/:id/messages', ...readStack, asyncHandler(controller.listMessages));
  router.post('/conversations/:id/messages', ...writeStack, asyncHandler(controller.sendMessage));
  router.post('/media/presign', ...writeStack, asyncHandler(controller.presignMedia));

  return router;
}
