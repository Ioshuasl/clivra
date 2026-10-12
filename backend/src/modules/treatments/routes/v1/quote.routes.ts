import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { QuoteController } from '../../controllers/quote.controller.js';

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
  authorize('quotes.read'),
];

const writeStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('quotes.write'),
];

export function buildQuoteRoutes(): Router {
  const router = Router();
  const controller = new QuoteController();

  router.get('/', ...readStack, asyncHandler(controller.list));
  router.post('/', ...writeStack, asyncHandler(controller.create));
  router.get('/:id', ...readStack, asyncHandler(controller.get));
  router.patch('/:id', ...writeStack, asyncHandler(controller.update));
  router.post('/:id/items', ...writeStack, asyncHandler(controller.createItem));
  router.delete('/:id/items/:itemId', ...writeStack, asyncHandler(controller.deleteItem));
  router.post('/:id/send', ...writeStack, asyncHandler(controller.send));
  router.post('/:id/duplicate', ...writeStack, asyncHandler(controller.duplicate));
  router.post('/:id/decision', ...writeStack, asyncHandler(controller.decide));
  router.get('/:id/pdf', ...readStack, asyncHandler(controller.getPdf));

  return router;
}
