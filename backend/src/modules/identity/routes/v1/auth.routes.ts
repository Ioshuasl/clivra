import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import {
  bodyEmailKey,
  clientIp,
  rateLimit,
} from '../../../../shared/middlewares/rate_limit.middleware.js';
import { AuthController } from '../../controllers/auth.controller.js';

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

export function buildAuthRoutes(): Router {
  const router = Router();
  const controller = new AuthController();

  router.post('/signup', asyncHandler(controller.signup));
  router.post(
    '/login',
    rateLimit({ windowMs: 60_000, max: 10, key: (req) => `login:ip:${clientIp(req)}` }),
    rateLimit({ windowMs: 60_000, max: 5, key: (req) => `login:email:${bodyEmailKey(req)}:${clientIp(req)}` }),
    asyncHandler(controller.login),
  );
  router.post('/refresh', asyncHandler(controller.refresh));
  router.post('/logout', asyncHandler(controller.logout));
  router.post(
    '/logout-all',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    asyncHandler(controller.logoutAll),
  );
  router.post(
    '/password/forgot',
    rateLimit({
      windowMs: 60 * 60_000,
      max: 3,
      key: (req) => `forgot:${bodyEmailKey(req) || clientIp(req)}`,
    }),
    asyncHandler(controller.forgotPassword),
  );
  router.post('/password/reset', asyncHandler(controller.resetPassword));
  router.get(
    '/me',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    asyncHandler(controller.me),
  );
  router.post(
    '/switch-tenant',
    asyncHandler(authenticateMiddleware),
    tenantContextMiddleware,
    asyncHandler(controller.switchTenant),
  );

  return router;
}
