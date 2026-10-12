import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { AsaasWebhookController } from '../../controllers/asaas_webhook.controller.js';

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

/** Sem authenticate/tenantContext/subscriptionGuard: a autenticação é o token do webhook. */
export function buildAsaasWebhookRoutes(): Router {
  const router = Router();
  const controller = new AsaasWebhookController();
  router.post('/', asyncHandler(controller.handle));
  return router;
}
