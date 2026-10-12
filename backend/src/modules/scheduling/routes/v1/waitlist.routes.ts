import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { WaitlistController } from '../../controllers/waitlist.controller.js';

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

const writeStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('agenda.write'),
];

const readStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('agenda.write'),
];

export function buildWaitlistRoutes(): Router {
  const router = Router();
  const controller = new WaitlistController();

  router.get('/', ...readStack, asyncHandler(controller.list));
  router.post('/', ...writeStack, asyncHandler(controller.create));
  router.delete('/:id', ...writeStack, asyncHandler(controller.delete));
  router.post('/:id/offer', ...writeStack, asyncHandler(controller.offer));

  return router;
}
