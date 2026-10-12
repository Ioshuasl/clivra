import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { AppointmentController } from '../../controllers/appointment.controller.js';

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
  authorize('agenda.read'),
];

const writeStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('agenda.write'),
];

export function buildAppointmentRoutes(): Router {
  const router = Router();
  const controller = new AppointmentController();

  router.get('/', ...readStack, asyncHandler(controller.list));
  router.post('/', ...writeStack, asyncHandler(controller.create));
  router.get('/:id', ...readStack, asyncHandler(controller.get));
  router.patch('/:id', ...writeStack, asyncHandler(controller.update));
  router.post('/:id/status', ...writeStack, asyncHandler(controller.changeStatus));
  router.delete('/:id', ...writeStack, asyncHandler(controller.remove));
  router.get('/:id/history', ...readStack, asyncHandler(controller.history));

  return router;
}

export function buildAvailabilityRoutes(): Router {
  const router = Router();
  const controller = new AppointmentController();
  router.get('/', ...readStack, asyncHandler(controller.availability));
  return router;
}
