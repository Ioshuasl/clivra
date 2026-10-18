import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application, type Request, type Router } from 'express';
import helmet from 'helmet';
import { env } from './shared/config/env.js';
import { ReadyController } from './modules/platform/controllers/ready.controller.js';
import { errorHandler } from './shared/middlewares/error_handler.middleware.js';
import { requestIdMiddleware } from './shared/middlewares/request_id.middleware.js';
import { buildApiRouter } from './routes/index.js';

function attachRawBody(req: Request, _res: unknown, buf: Buffer): void {
  req.rawBody = buf;
}

export function createApp(options?: { registerApi?: (api: Router) => void }): Application {
  const app = express();

  // Atrás do proxy do Easypanel o IP real vem em X-Forwarded-For; sem isso todos compartilham o IP do proxy.
  app.set('trust proxy', env.TRUST_PROXY ?? (env.NODE_ENV === 'production' ? 1 : 0));

  const origins = env.CORS_ORIGINS.split(',').map((o) => o.trim());

  app.use(helmet());
  app.use(
    cors({
      origin: origins,
      credentials: true,
    }),
  );
  app.use(
    '/api/v1/webhooks/whatsapp',
    express.json({ limit: '2mb', verify: attachRawBody }),
  );
  app.use(express.json({ limit: '1mb', verify: attachRawBody }));
  app.use(cookieParser());
  app.use(requestIdMiddleware);

  app.get('/health', (_req, res) => {
    res.status(200).json({ data: { status: 'ok', service: 'api' } });
  });

  const ready = new ReadyController();
  app.get('/ready', (req, res, next) => {
    void ready.get(req, res).catch(next);
  });

  const api = buildApiRouter();
  options?.registerApi?.(api);
  app.use('/api/v1', api);

  app.use(errorHandler);

  return app;
}
