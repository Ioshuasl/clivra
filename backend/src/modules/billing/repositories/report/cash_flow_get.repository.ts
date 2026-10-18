import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { civilDateUtc } from '../../helpers/civil_date.helper.js';
import { dateOnly, periodEndExclusiveUtc, periodStartUtc } from '../../helpers/money.helper.js';
import type { PaymentMethod } from '../../enum/payment/payment_method.enum.js';
import type { CashFlowLine, CashFlowRaw } from '../../types/report/report.types.js';
import type { CashFlowQuerySchema } from '../../schemas/billing.schema.js';

const OTHER = 'Outros';

function asMethod(value: string): PaymentMethod {
  return value as PaymentMethod;
}

export class GetRepository {
  async execute(ctx: RequestContext, query: CashFlowQuerySchema): Promise<CashFlowRaw> {
    const from = periodStartUtc(query.from);
    const toEx = periodEndExclusiveUtc(query.to);
    const unitId = query.unitId;

    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const openingPayments = await tx.payment.aggregate({
        where: {
          reversedAt: null,
          receivedAt: { lt: from },
          ...(unitId ? { unitId } : {}),
        },
        _sum: { amountCents: true },
      });
      const openingPayables = await tx.payable.aggregate({
        where: {
          paidAt: { not: null, lt: from },
          ...(unitId ? { unitId } : {}),
        },
        _sum: { paidCents: true, amountCents: true },
      });
      const openingInflowsCents = openingPayments._sum.amountCents ?? 0n;
      const openingOutflowsCents =
        openingPayables._sum.paidCents ?? openingPayables._sum.amountCents ?? 0n;

      if (query.basis === 'CASH') {
        const payments = await tx.payment.findMany({
          where: {
            reversedAt: null,
            receivedAt: { gte: from, lt: toEx },
            ...(unitId ? { unitId } : {}),
          },
          include: {
            splits: { select: { method: true, amountCents: true } },
            installment: {
              select: { receivable: { select: { category: { select: { name: true } } } } },
            },
          },
        });
        const payables = await tx.payable.findMany({
          where: {
            paidAt: { not: null, gte: from, lt: toEx },
            ...(unitId ? { unitId } : {}),
          },
          include: { category: { select: { name: true } } },
        });
        const inflows: CashFlowLine[] = [];
        for (const payment of payments) {
          const date = dateOnly(payment.receivedAt);
          const category = payment.installment.receivable.category?.name ?? OTHER;
          for (const split of payment.splits) {
            inflows.push({
              date,
              amountCents: split.amountCents,
              category,
              method: asMethod(split.method),
            });
          }
        }
        const outflows: CashFlowLine[] = payables.map((row) => ({
          date: dateOnly(row.paidAt ?? row.dueDate),
          amountCents: row.paidCents ?? row.amountCents,
          category: row.category?.name ?? OTHER,
          method: row.method ? asMethod(row.method) : null,
        }));
        return { openingInflowsCents, openingOutflowsCents, inflows, outflows };
      }

      const dueFrom = civilDateUtc(query.from);
      const dueTo = civilDateUtc(query.to);
      const installments = await tx.installment.findMany({
        where: {
          status: { not: 'CANCELLED' },
          dueDate: { gte: dueFrom, lte: dueTo },
          ...(unitId ? { receivable: { unitId } } : {}),
        },
        include: { receivable: { select: { category: { select: { name: true } } } } },
      });
      const payables = await tx.payable.findMany({
        where: {
          dueDate: { gte: dueFrom, lte: dueTo },
          ...(unitId ? { unitId } : {}),
        },
        include: { category: { select: { name: true } } },
      });
      const inflows: CashFlowLine[] = installments.map((row) => ({
        date: dateOnly(row.dueDate),
        amountCents: row.amountCents,
        category: row.receivable.category?.name ?? OTHER,
        method: null,
      }));
      const outflows: CashFlowLine[] = payables.map((row) => ({
        date: dateOnly(row.dueDate),
        amountCents: row.amountCents,
        category: row.category?.name ?? OTHER,
        method: null,
      }));
      return { openingInflowsCents, openingOutflowsCents, inflows, outflows };
    });
  }
}
