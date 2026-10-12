import type { PrismaClient } from '@prisma/client';
import { idGenerator } from '../../src/shared/helpers/id_generator.js';
import { DEFAULT_FINANCIAL_CATEGORIES } from '../../src/modules/billing/helpers/financial_category_seed.helper.js';

export async function seedBilling(prisma: PrismaClient, tenantId: string) {
  for (const category of DEFAULT_FINANCIAL_CATEGORIES) {
    const existing = await prisma.financialCategory.findFirst({
      where: { tenantId, name: category.name, kind: category.kind },
    });
    if (existing) continue;
    await prisma.financialCategory.create({
      data: {
        id: idGenerator.next(),
        tenantId,
        name: category.name,
        kind: category.kind,
        active: true,
      },
    });
  }
}
