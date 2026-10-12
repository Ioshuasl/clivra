import type { NextFunction, Request, Response } from 'express';
import { AppError } from './error_handler.middleware.js';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  key: (req: Request) => string;
};

const hits = new Map<string, number[]>();

function prune(key: string, windowStart: number): number[] {
  const stamps = (hits.get(key) ?? []).filter((t) => t > windowStart);
  hits.set(key, stamps);
  return stamps;
}

export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const windowStart = now - options.windowMs;
    const bucketKey = options.key(req);
    const stamps = prune(bucketKey, windowStart);
    const remaining = Math.max(0, options.max - stamps.length);
    const oldest = stamps[0];
    const resetMs = oldest ? oldest + options.windowMs : now + options.windowMs;

    res.setHeader('RateLimit-Limit', String(options.max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, remaining - 1)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(resetMs / 1000)));

    if (stamps.length >= options.max) {
      next(
        new AppError(
          'RATE_LIMITED',
          'Muitas tentativas. Tente novamente em instantes.',
          429,
        ),
      );
      return;
    }

    stamps.push(now);
    hits.set(bucketKey, stamps);
    next();
  };
}

export function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

export function bodyEmailKey(req: Request): string {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' ? email.toLowerCase() : '';
}

export function bodyPhoneKey(req: Request): string {
  const phone = (req.body as { phone?: unknown } | undefined)?.phone;
  return typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
}
