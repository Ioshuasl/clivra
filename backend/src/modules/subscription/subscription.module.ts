import { Router } from 'express';
import { buildAsaasWebhookRoutes } from './routes/v1/asaas_webhook.routes.js';
import { buildSubscriptionRoutes } from './routes/v1/subscription.routes.js';

/** Bounded context subscription (E10) — trial, planos, limites e cobrança (Asaas, ADR-0017). */
export function buildSubscriptionRouter(): Router {
  const router = Router();
  router.use('/subscription', buildSubscriptionRoutes());
  return router;
}

/** Webhook do Asaas — montado em `/webhooks/asaas`, fora de auth de usuário e de tenant. */
export function buildAsaasWebhookRouter(): Router {
  return buildAsaasWebhookRoutes();
}
