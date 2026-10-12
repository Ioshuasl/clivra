import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { periodBoundsUtc } from '../../helpers/civil_period.helper.js';
import type { ProceduresReportDto } from '../../types/report/report.types.js';

export type ProceduresQueryInput = {
  from: string;
  to: string;
  timezone: string;
  professionalId?: string;
  unitId?: string;
};

export class GetRepository {
  async execute(ctx: RequestContext, query: ProceduresQueryInput): Promise<ProceduresReportDto> {
    const bounds = periodBoundsUtc(query.from, query.to, query.timezone);

    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const rows = await tx.productionEntry.groupBy({
        by: ['procedureId'],
        where: {
          executedAt: { gte: bounds.start, lt: bounds.endExclusive },
          ...(query.unitId ? { unitId: query.unitId } : {}),
          ...(query.professionalId ? { professionalId: query.professionalId } : {}),
        },
        _count: { _all: true },
        _sum: { amountCents: true },
      });

      const procedureIds = rows.map((row) => row.procedureId);
      const procedures =
        procedureIds.length === 0
          ? []
          : await tx.procedure.findMany({
              where: { id: { in: procedureIds } },
              select: { id: true, code: true, name: true },
            });
      const byId = new Map(procedures.map((row) => [row.id, row]));

      const items = rows
        .map((row) => {
          const procedure = byId.get(row.procedureId);
          return {
            procedureId: row.procedureId,
            procedureCode: procedure?.code ?? '',
            procedureName: procedure?.name ?? 'Procedimento',
            count: row._count._all,
            totalCents: Number(row._sum.amountCents ?? 0n),
          };
        })
        .sort((a, b) => b.count - a.count || a.procedureName.localeCompare(b.procedureName));

      return {
        from: query.from,
        to: query.to,
        items,
      };
    });
  }
}
