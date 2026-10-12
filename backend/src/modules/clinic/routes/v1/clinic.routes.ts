import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize, authorizeAny } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { ClinicController } from '../../controllers/clinic.controller.js';

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
  authorize('settings.read'),
];

/** Catálogo operacional da agenda (dentista/recepção/ASB sem `settings.read`). */
const agendaCatalogReadStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorizeAny('settings.read', 'agenda.read'),
];

const writeStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('settings.write'),
];

export function buildClinicRoutes(): Router {
  const router = Router();
  const controller = new ClinicController();

  router.get('/', ...agendaCatalogReadStack, asyncHandler(controller.getClinic));
  router.patch('/', ...writeStack, asyncHandler(controller.updateClinic));

  router.get('/onboarding', ...readStack, asyncHandler(controller.getOnboarding));
  router.patch('/onboarding', ...writeStack, asyncHandler(controller.updateOnboarding));

  router.get('/units', ...readStack, asyncHandler(controller.listUnits));
  router.post('/units', ...writeStack, asyncHandler(controller.createUnit));
  router.patch('/units/:id', ...writeStack, asyncHandler(controller.updateUnit));

  router.get('/units/:id/chairs', ...agendaCatalogReadStack, asyncHandler(controller.listChairs));
  router.post('/units/:id/chairs', ...writeStack, asyncHandler(controller.createChair));
  router.patch('/units/:id/chairs/:chairId', ...writeStack, asyncHandler(controller.updateChair));

  router.get('/business-hours', ...readStack, asyncHandler(controller.getBusinessHours));
  router.put('/business-hours', ...writeStack, asyncHandler(controller.replaceBusinessHours));
  router.post(
    '/business-hours/exceptions',
    ...writeStack,
    asyncHandler(controller.createBusinessHoursException),
  );

  router.get('/professionals', ...agendaCatalogReadStack, asyncHandler(controller.listProfessionals));
  router.post('/professionals', ...writeStack, asyncHandler(controller.createProfessional));
  router.patch('/professionals/:id', ...writeStack, asyncHandler(controller.updateProfessional));

  return router;
}
