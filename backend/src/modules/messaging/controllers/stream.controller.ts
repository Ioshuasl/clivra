import type { Request, Response } from 'express';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import { subscribeMessagingStream } from '../helpers/messaging_stream.helper.js';

const HEARTBEAT_MS = 25_000;

function requireCtx(req: Request) {
  if (!req.ctx) {
    throw new AppError('UNAUTHENTICATED', 'Token de acesso ausente.', 401);
  }
  return req.ctx;
}

export class StreamController {
  subscribe = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(': connected\n\n');

    const unsubscribe = subscribeMessagingStream(ctx.tenantId, (event) => {
      res.write(`event: ${event.name}\n`);
      res.write(`data: ${JSON.stringify(event.payload)}\n\n`);
    });

    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, HEARTBEAT_MS);

    let closed = false;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      unsubscribe();
    };

    req.on('close', cleanup);
    req.on('aborted', cleanup);
  };
}
