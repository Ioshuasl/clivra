import type { PrismaClient } from '@prisma/client';
import { DEFAULT_PLAN_ID } from '../../src/modules/subscription/enum/plan/plan_code.enum.js';
import { SubscriptionStatus } from '../../src/modules/subscription/enum/subscription/subscription_status.enum.js';
import { addDays } from '../../src/modules/identity/helpers/slug.helper.js';
import { idGenerator } from '../../src/shared/helpers/id_generator.js';

/** Garante planos seed + subscription TRIAL do tenant demo. */
export async function seedSubscription(prisma: PrismaClient, tenantId: string): Promise<void> {
  const plans = [
    {
      id: 'a1000000-0000-4000-8000-000000000001',
      code: 'ESSENCIAL',
      name: 'Essencial',
      priceCents: 9900n,
      limits: { professionals: 1, adminUsers: 2, units: 1, storageGb: 5, messagesMonth: null },
    },
    {
      id: 'a1000000-0000-4000-8000-000000000002',
      code: 'CLINICA',
      name: 'Clínica',
      priceCents: 19900n,
      limits: { professionals: 5, adminUsers: 6, units: 1, storageGb: 25, messagesMonth: null },
    },
    {
      id: 'a1000000-0000-4000-8000-000000000003',
      code: 'REDE',
      name: 'Rede',
      priceCents: 39900n,
      limits: { professionals: null, adminUsers: null, units: 5, storageGb: 100, messagesMonth: null },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        priceCents: plan.priceCents,
        interval: 'MONTHLY',
        limits: plan.limits,
        active: true,
      },
      update: {
        name: plan.name,
        priceCents: plan.priceCents,
        limits: plan.limits,
        active: true,
      },
    });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return;

  const trialEndsAt = addDays(new Date(), 14);
  const existing = await prisma.subscription.findUnique({ where: { tenantId } });
  if (existing) {
    // Re-seed restaura trial gravável (+14d) — smokes/ops podem deixar EXPIRED ou trialEndsAt no passado.
    await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: SubscriptionStatus.TRIAL,
        trialEndsAt,
      },
    });
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'TRIAL',
        trialEndsAt,
      },
    });
    return;
  }

  await prisma.subscription.create({
    data: {
      id: idGenerator.next(),
      tenantId,
      planId: DEFAULT_PLAN_ID,
      status: SubscriptionStatus.TRIAL,
      trialEndsAt,
    },
  });
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { status: 'TRIAL', trialEndsAt },
  });
}
