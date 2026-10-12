import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import {
  AppointmentSeriesController,
  ScheduleBlockController,
} from '../../controllers/schedule_extras.controller.js';

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

export function buildScheduleBlockRoutes(): Router {
  const router = Router();
  const controller = new ScheduleBlockController();
  router.post('/', ...writeStack, asyncHandler(controller.createBlock));
  router.delete('/:id', ...writeStack, asyncHandler(controller.deleteBlock));
  return router;
}

export function buildAppointmentSeriesRoutes(): Router {
  const router = Router();
  const controller = new AppointmentSeriesController();
  router.post('/', ...writeStack, asyncHandler(controller.createSeries));
  router.delete('/:id', ...writeStack, asyncHandler(controller.deleteSeries));
  return router;
}
