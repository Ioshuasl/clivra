import type { Request, Response } from 'express';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import { messagingSseHub } from '../helpers/sse_hub.helper.js';

function requireCtx(req: Request) {
  if (!req.ctx) {
    throw new AppError('UNAUTHENTICATED', 'Token de acesso ausente.', 401);
  }
  return req.ctx;
}

export class StreamController {
  stream = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

    const unsubscribe = messagingSseHub.subscribe(ctx.tenantId, (event) => {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
    });

    const ping = setInterval(() => {
      res.write(`: ping\n\n`);
    }, 25_000);

    const cleanup = () => {
      clearInterval(ping);
      unsubscribe();
    };

    req.on('close', cleanup);
    req.on('aborted', cleanup);
  };
}
