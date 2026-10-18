import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { zonedDayEndExclusiveUtc, zonedDayStartUtc } from '../../helpers/civil_date.helper.js';
import type { ProductionReportQuerySchema } from '../../schemas/billing.schema.js';
import type { ProductionItemDto, ProductionReportDto, ProductionRowDto } from '../../types/report/report.types.js';

export class GetRepository {
  async execute(
    ctx: RequestContext,
    query: ProductionReportQuerySchema,
    timezone: string,
  ): Promise<ProductionReportDto> {
    // O período é em dias da clínica (fuso dela), não em dias UTC.
    const from = zonedDayStartUtc(query.from, timezone);
    const toEx = zonedDayEndExclusiveUtc(query.to, timezone);

    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const entries = await tx.productionEntry.findMany({
        where: {
          executedAt: { gte: from, lt: toEx },
          ...(query.professionalId ? { professionalId: query.professionalId } : {}),
        },
        include: {
          procedure: { select: { name: true } },
          patient: { select: { code: true } },
          professional: {
            select: { id: true, membership: { select: { user: { select: { name: true } } } } },
          },
          treatmentItem: { select: { treatmentPlanId: true } },
        },
        orderBy: [{ executedAt: 'asc' }, { id: 'asc' }],
      });

      const planIdsByProfessional = new Map<string, Set<string>>();
      const rows: ProductionRowDto[] = entries.map((entry) => {
        const professionalName = entry.professional.membership.user?.name ?? 'Profissional';
        const planId = entry.treatmentItem?.treatmentPlanId;
        if (planId) {
          const set = planIdsByProfessional.get(entry.professionalId) ?? new Set<string>();
          set.add(planId);
          planIdsByProfessional.set(entry.professionalId, set);
        }
        return {
          professionalId: entry.professionalId,
          professionalName,
          procedureName: entry.procedure.name,
          patientCode: Number(entry.patient.code),
          executedAt: entry.executedAt.toISOString(),
          executedCents: Number(entry.amountCents),
        };
      });

      const receivedByProfessional = new Map<string, bigint>();
      for (const [professionalId, planIds] of planIdsByProfessional) {
        if (planIds.size === 0) continue;
        const paid = await tx.payment.aggregate({
          where: {
            reversedAt: null,
            installment: { receivable: { treatmentPlanId: { in: [...planIds] } } },
          },
          _sum: { amountCents: true },
        });
        receivedByProfessional.set(professionalId, paid._sum.amountCents ?? 0n);
      }

      const grouped = new Map<string, ProductionItemDto>();
      for (const row of rows) {
        const current = grouped.get(row.professionalId);
        if (!current) {
          grouped.set(row.professionalId, {
            professionalId: row.professionalId,
            professionalName: row.professionalName,
            executedCents: row.executedCents,
            receivedCents: Number(receivedByProfessional.get(row.professionalId) ?? 0n),
            proceduresCount: 1,
          });
          continue;
        }
        current.executedCents += row.executedCents;
        current.proceduresCount += 1;
      }

      return { items: [...grouped.values()], rows };
    });
  }
}
