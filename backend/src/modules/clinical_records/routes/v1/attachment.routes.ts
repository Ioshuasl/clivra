import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { AttachmentController } from '../../controllers/attachment.controller.js';

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

const clinicalReadStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('clinical_records.read'),
];

const clinicalWriteStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('clinical_records.write'),
];

export function buildAttachmentRoutes(): Router {
  const router = Router();
  const attachments = new AttachmentController();

  router.get('/:id/download', ...clinicalReadStack, asyncHandler(attachments.download));
  router.delete('/:id', ...clinicalWriteStack, asyncHandler(attachments.delete));

  return router;
}
