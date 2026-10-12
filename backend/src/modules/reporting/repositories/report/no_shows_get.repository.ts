import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { periodBoundsUtc } from '../../helpers/civil_period.helper.js';
import type { NoShowsReportDto } from '../../types/report/report.types.js';

export type NoShowsQueryInput = {
  from: string;
  to: string;
  timezone: string;
  professionalId?: string;
  unitId?: string;
};

export class GetRepository {
  async execute(ctx: RequestContext, query: NoShowsQueryInput): Promise<NoShowsReportDto> {
    const bounds = periodBoundsUtc(query.from, query.to, query.timezone);

    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const rows = await tx.appointment.findMany({
        where: {
          status: { in: ['NO_SHOW', 'CANCELLED'] },
          startsAt: { gte: bounds.start, lt: bounds.endExclusive },
          ...(query.unitId ? { unitId: query.unitId } : {}),
          ...(query.professionalId ? { professionalId: query.professionalId } : {}),
        },
        include: {
          patient: { select: { id: true, code: true } },
          procedure: { select: { name: true, priceCents: true } },
          professional: {
            select: { id: true, membership: { select: { user: { select: { name: true } } } } },
          },
        },
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      });

      let noShowCount = 0;
      let cancelledCount = 0;
      let estimatedLossCents = 0;
      const items = rows.map((row) => {
        const loss = row.status === 'NO_SHOW' ? Number(row.procedure?.priceCents ?? 0n) : 0;
        if (row.status === 'NO_SHOW') {
          noShowCount += 1;
          estimatedLossCents += loss;
        } else {
          cancelledCount += 1;
        }
        return {
          appointmentId: row.id,
          patientId: row.patient.id,
          patientCode: Number(row.patient.code),
          professionalId: row.professional.id,
          professionalName: row.professional.membership.user?.name ?? 'Profissional',
          procedureName: row.procedure?.name ?? null,
          status: row.status,
          startsAt: row.startsAt.toISOString(),
          estimatedLossCents: loss,
        };
      });

      return {
        from: query.from,
        to: query.to,
        noShowCount,
        cancelledCount,
        estimatedLossCents,
        items,
      };
    });
  }
}
