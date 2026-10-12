import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { UserController } from '../../controllers/user.controller.js';

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

const ownerOnly: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('users.manage'),
];

export function buildUserRoutes(): Router {
  const router = Router();
  const controller = new UserController();

  router.get('/', ...ownerOnly, asyncHandler(controller.list));
  router.patch('/:id', ...ownerOnly, asyncHandler(controller.update));

  return router;
}
