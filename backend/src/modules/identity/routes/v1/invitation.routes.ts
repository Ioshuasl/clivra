import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { clientIp, rateLimit } from '../../../../shared/middlewares/rate_limit.middleware.js';
import { InvitationController } from '../../controllers/invitation.controller.js';

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

export function buildInvitationRoutes(): Router {
  const router = Router();
  const controller = new InvitationController();

  router.post(
    '/accept',
    rateLimit({ windowMs: 60 * 60_000, max: 10, key: (req) => `invite-accept:${clientIp(req)}` }),
    asyncHandler(controller.accept),
  );

  router.post('/', ...ownerOnly, asyncHandler(controller.create));
  router.get('/', ...ownerOnly, asyncHandler(controller.list));
  router.post('/:id/resend', ...ownerOnly, asyncHandler(controller.resend));
  router.delete('/:id', ...ownerOnly, asyncHandler(controller.delete));

  return router;
}
