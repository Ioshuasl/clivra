import type { PrismaClient } from '@prisma/client';
import { idGenerator } from '../../src/shared/helpers/id_generator.js';

const SUBSCRIPTION_STATUSES = new Set([
  'TRIAL',
  'ACTIVE',
  'PAST_DUE',
  'SUSPENDED',
  'EXPIRED',
  'CANCELLED',
]);

export async function seedSubscription(
  prisma: PrismaClient,
  tenant: { id: string; status: string; trialEndsAt: Date | null },
) {
  const existing = await prisma.subscription.findUnique({ where: { tenantId: tenant.id } });
  if (existing) {
    console.info('seed: reusando subscription');
    return existing;
  }

  const plan = await prisma.plan.findUnique({ where: { code: 'ESSENCIAL' } });
  if (!plan) {
    throw new Error('seed: plano ESSENCIAL não encontrado — rode as migrations.');
  }

  const trialEndsAt = tenant.trialEndsAt ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const status = SUBSCRIPTION_STATUSES.has(tenant.status) ? tenant.status : 'TRIAL';

  const row = await prisma.subscription.create({
    data: {
      id: idGenerator.next(),
      tenantId: tenant.id,
      planId: plan.id,
      status,
      currentPeriodEnd: trialEndsAt,
      trialEndsAt,
    },
  });
  console.info('seed: subscription no plano Essencial');
  return row;
}
