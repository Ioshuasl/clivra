import type { NextFunction, Request, Response } from 'express';
import { assertSubscriptionWritable } from '../../modules/subscription/subscription_public.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function subscriptionGuard(req: Request, _res: Response, next: NextFunction): void {
  void assertSubscriptionRequest(req).then(next).catch(next);
}

async function assertSubscriptionRequest(req: Request): Promise<void> {
  if (!req.ctx) return;
  const method = req.method.toUpperCase();
  if (SAFE_METHODS.has(method)) return;
  if (isAllowedWrite(req.originalUrl ?? req.url ?? '')) return;
  await assertSubscriptionWritable(req.ctx);
}

function isAllowedWrite(url: string): boolean {
  const path = url.split('?')[0] ?? '';
  if (path.includes('/auth/')) return true;
  if (path.includes('/webhooks/')) return true;
  if (path.includes('/reports/') && path.includes('/export')) return true;
  if (path.includes('/privacy/')) return true;
  // Quem está EXPIRED/SUSPENDED precisa conseguir pagar (ou cancelar) — ADR-0017.
  if (path.endsWith('/subscription/checkout') || path.endsWith('/subscription/cancel')) return true;
  // Contingência manual (BILLING_PROVIDER=manual): a operação precisa reativar quem está read-only.
  if (path.includes('/subscription/ops/')) return true;
  if (path.includes('/users/invitations/accept')) return true;
  return false;
}
