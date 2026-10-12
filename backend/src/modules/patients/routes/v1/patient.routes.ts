import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { PatientController } from '../../controllers/patient.controller.js';

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
  authorize('patients.read'),
];

const writeStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('patients.write'),
];

export function buildPatientRoutes(): Router {
  const router = Router();
  const controller = new PatientController();

  router.get('/', ...readStack, asyncHandler(controller.listPatients));
  router.post('/', ...writeStack, asyncHandler(controller.createPatient));
  router.get(
    '/check-duplicate',
    ...readStack,
    asyncHandler(controller.checkDuplicatePatient),
  );

  router.get('/:id', ...readStack, asyncHandler(controller.getPatient));
  router.patch('/:id', ...writeStack, asyncHandler(controller.updatePatient));
  router.delete('/:id', ...writeStack, asyncHandler(controller.deletePatient));

  router.get('/:id/timeline', ...readStack, asyncHandler(controller.getTimeline));
  router.post('/:id/guardians', ...writeStack, asyncHandler(controller.createGuardian));
  router.get('/:id/consents', ...readStack, asyncHandler(controller.listConsents));
  router.post('/:id/consents', ...writeStack, asyncHandler(controller.createConsent));

  return router;
}
