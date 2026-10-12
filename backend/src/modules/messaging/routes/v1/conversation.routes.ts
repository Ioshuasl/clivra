import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
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
  authorize('messaging.read'),
];

const writeStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('messaging.write'),
];

export function buildConversationRoutes(): Router {
  const router = Router();
  const controller = new ConversationController();

  router.get('/conversations', ...readStack, asyncHandler(controller.list));
  router.get('/messages', ...readStack, asyncHandler(controller.listPatientMessages));
  router.get('/conversations/:id/messages', ...readStack, asyncHandler(controller.listMessages));
  router.post('/conversations/:id/media/presign', ...writeStack, asyncHandler(controller.presignMedia));
  router.post('/conversations/:id/messages', ...writeStack, asyncHandler(controller.createMessage));
  router.post('/conversations/:id/read', ...writeStack, asyncHandler(controller.read));
  router.get('/conversations/:id', ...readStack, asyncHandler(controller.get));
  router.patch('/conversations/:id', ...writeStack, asyncHandler(controller.update));

  return router;
}
