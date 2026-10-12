import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import {
  civilDateUtc,
  monthStart,
  nextMonthStart,
  wallTimeToUtc,
  dayBoundsUtc,
} from '../../helpers/civil_period.helper.js';
import type { DashboardDto } from '../../types/report/report.types.js';

export type DashboardQueryInput = {
  date: string;
  timezone: string;
  unitId?: string;
  professionalId?: string;
  includeReceivable: boolean;
};

export class GetRepository {
  async execute(ctx: RequestContext, query: DashboardQueryInput): Promise<DashboardDto> {
    const { date, timezone, unitId, professionalId, includeReceivable } = query;
    const day = dayBoundsUtc(date, timezone);
    const monthFrom = monthStart(date);
    const monthStartUtc = wallTimeToUtc(monthFrom, '00:00', timezone);
    const monthEndExclusiveUtc = wallTimeToUtc(nextMonthStart(date), '00:00', timezone);

    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const appointments = await tx.appointment.groupBy({
        by: ['status'],
        where: {
          startsAt: { gte: day.start, lt: day.endExclusive },
          ...(unitId ? { unitId } : {}),
          ...(professionalId ? { professionalId } : {}),
        },
        _count: { _all: true },
      });

      const agendaByStatus: Record<string, number> = {};
      for (const row of appointments) {
        agendaByStatus[row.status] = row._count._all;
      }

      let receivableTodayCents = 0;
      let receivableTodayCount = 0;
      if (includeReceivable) {
        const due = civilDateUtc(date);
        const installments = await tx.installment.findMany({
          where: {
            dueDate: due,
            status: { in: ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'] },
            ...(unitId ? { receivable: { unitId } } : {}),
          },
          select: { amountCents: true, paidCents: true },
        });
        for (const row of installments) {
          const remaining = row.amountCents - row.paidCents;
          if (remaining <= 0n) continue;
          receivableTodayCents += Number(remaining);
          receivableTodayCount += 1;
        }
      }

      const noShowsMonthCount = await tx.appointment.count({
        where: {
          status: 'NO_SHOW',
          startsAt: { gte: monthStartUtc, lt: monthEndExclusiveUtc },
          ...(unitId ? { unitId } : {}),
          ...(professionalId ? { professionalId } : {}),
        },
      });

      const productionAgg = await tx.productionEntry.aggregate({
        where: {
          executedAt: { gte: monthStartUtc, lt: monthEndExclusiveUtc },
          ...(unitId ? { unitId } : {}),
          ...(professionalId ? { professionalId } : {}),
        },
        _sum: { amountCents: true },
      });

      return {
        date,
        timezone,
        agendaByStatus,
        receivableTodayCents,
        receivableTodayCount,
        noShowsMonthCount,
        productionMonthCents: Number(productionAgg._sum.amountCents ?? 0n),
        drillDown: {
          agenda: `/app/agenda?date=${date}`,
          receivableToday: `/app/financeiro/receber?due=${date}`,
          noShows: `/app/relatorios/faltas?from=${monthFrom}&to=${date}`,
          production: `/app/relatorios/producao?from=${monthFrom}&to=${date}`,
        },
      };
    });
  }
}
