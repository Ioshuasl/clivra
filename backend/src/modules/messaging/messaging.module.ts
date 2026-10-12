import { Router } from 'express';
import { buildConversationRoutes } from './routes/v1/conversation.routes.js';
import { buildMessagingRoutes } from './routes/v1/messaging.routes.js';
import { buildStreamRoutes } from './routes/v1/stream.routes.js';
import { buildWhatsappWebhookRoutes } from './routes/v1/whatsapp_webhook.routes.js';

export function buildMessagingRouter(): Router {
  const router = Router();
  router.use('/messaging', buildMessagingRoutes());
  router.use('/messaging', buildConversationRoutes());
  return router;
}

export function buildStreamRouter(): Router {
  const router = Router();
  router.use('/stream', buildStreamRoutes());
  return router;
}

export function buildWhatsappWebhookRouter(): Router {
  return buildWhatsappWebhookRoutes();
}
