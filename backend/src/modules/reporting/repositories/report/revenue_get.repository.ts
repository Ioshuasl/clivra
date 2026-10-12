import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { RevenueGroupBy } from '../../enum/report/revenue_group_by.enum.js';
import {
  civilDateInTimezone,
  civilMonthInTimezone,
  periodBoundsUtc,
} from '../../helpers/civil_period.helper.js';
import type { RevenueBucketDto, RevenueReportDto } from '../../types/report/report.types.js';

export type RevenueQueryInput = {
  from: string;
  to: string;
  timezone: string;
  groupBy: RevenueGroupBy;
  unitId?: string;
};

export class GetRepository {
  async execute(ctx: RequestContext, query: RevenueQueryInput): Promise<RevenueReportDto> {
    const bounds = periodBoundsUtc(query.from, query.to, query.timezone);

    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const payments = await tx.payment.findMany({
        where: {
          reversedAt: null,
          receivedAt: { gte: bounds.start, lt: bounds.endExclusive },
          ...(query.unitId ? { unitId: query.unitId } : {}),
        },
        include: {
          installment: {
            select: {
              receivable: {
                select: {
                  quote: {
                    select: {
                      professionalId: true,
                      professional: {
                        select: {
                          membership: { select: { user: { select: { name: true } } } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
      });

      const buckets = new Map<string, RevenueBucketDto>();
      let totalCents = 0;

      for (const payment of payments) {
        const amount = Number(payment.amountCents);
        totalCents += amount;

        let key: string;
        let label: string;
        if (query.groupBy === 'day') {
          key = civilDateInTimezone(payment.receivedAt, query.timezone);
          label = key;
        } else if (query.groupBy === 'month') {
          key = civilMonthInTimezone(payment.receivedAt, query.timezone);
          label = key;
        } else {
          const professionalId =
            payment.installment.receivable.quote?.professionalId ?? 'unassigned';
          const professionalName =
            payment.installment.receivable.quote?.professional.membership.user?.name ??
            'Sem profissional';
          key = professionalId;
          label = professionalName;
        }

        const current = buckets.get(key);
        if (!current) {
          buckets.set(key, { key, label, amountCents: amount, count: 1 });
        } else {
          current.amountCents += amount;
          current.count += 1;
        }
      }

      return {
        from: query.from,
        to: query.to,
        groupBy: query.groupBy,
        totalCents,
        buckets: [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key)),
      };
    });
  }
}
