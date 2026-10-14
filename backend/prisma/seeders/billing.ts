import type { PrismaClient } from '@prisma/client';
import { idGenerator } from '../../src/shared/helpers/id_generator.js';
import { DEFAULT_FINANCIAL_CATEGORIES } from '../../src/modules/billing/helpers/financial_category_seed.helper.js';
import { dateOnly } from './helpers.js';

/** Saldo OPEN mínimo da Maria para aceites S6 (várias baixas no Run-S6). */
const MARIA_OPEN_BALANCE_FLOOR_CENTS = 30_000n;

export async function seedBilling(
  prisma: PrismaClient,
  input: { tenantId: string; unitId: string; patientId: string },
) {
  for (const category of DEFAULT_FINANCIAL_CATEGORIES) {
    const existing = await prisma.financialCategory.findFirst({
      where: { tenantId: input.tenantId, name: category.name, kind: category.kind },
    });
    if (existing) continue;
    await prisma.financialCategory.create({
      data: {
        id: idGenerator.next(),
        tenantId: input.tenantId,
        name: category.name,
        kind: category.kind,
        active: true,
      },
    });
  }

  const openLines = await prisma.installment.findMany({
    where: {
      tenantId: input.tenantId,
      receivable: { patientId: input.patientId },
      status: { in: ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'] },
    },
    select: { amountCents: true, paidCents: true },
  });
  const openBalance = openLines.reduce(
    (acc, row) => acc + (row.amountCents - row.paidCents),
    0n,
  );
  if (openBalance >= MARIA_OPEN_BALANCE_FLOOR_CENTS) {
    console.info(`  parcelas OPEN Maria ok (saldo ${openBalance}c)`);
    return;
  }

  const totalCents = MARIA_OPEN_BALANCE_FLOOR_CENTS;
  const installmentCount = 3;
  const base = totalCents / BigInt(installmentCount);
  const remainder = totalCents % BigInt(installmentCount);
  const receivableId = idGenerator.next();

  await prisma.receivable.create({
    data: {
      id: receivableId,
      tenantId: input.tenantId,
      unitId: input.unitId,
      patientId: input.patientId,
      totalCents,
      installmentCount,
      status: 'OPEN',
      description: '[seed] parcelas OPEN Maria (aceite billing)',
      lines: {
        create: Array.from({ length: installmentCount }, (_, index) => ({
          id: idGenerator.next(),
          tenantId: input.tenantId,
          number: index + 1,
          dueDate: dateOnly(7 + index * 30),
          amountCents: index === 0 ? base + remainder : base,
          paidCents: 0n,
          status: 'OPEN',
        })),
      },
    },
  });
  console.info(`  parcelas OPEN Maria +${totalCents}c (${installmentCount}x)`);
}
