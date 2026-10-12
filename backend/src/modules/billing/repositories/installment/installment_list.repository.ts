import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { civilDateUtc } from '../../helpers/civil_date.helper.js';
import { effectiveInstallmentStatus } from '../../models/overdue.model.js';
import type { InstallmentListQuerySchema } from '../../schemas/billing.schema.js';
import type { InstallmentListResult } from '../../types/receivable/receivable_http.types.js';
import { toInstallmentDto } from '../receivable/mappers/receivable.mapper.js';

export class ListRepository {
  async execute(
    ctx: RequestContext,
    query: InstallmentListQuerySchema,
    today: string,
  ): Promise<InstallmentListResult> {
    const limit = query.limit ?? 20;
    const dueFrom = query.dueFrom ? civilDateUtc(query.dueFrom) : undefined;
    const dueTo = query.dueTo ? civilDateUtc(query.dueTo) : undefined;
    const todayDate = civilDateUtc(today);

    const rows = await getTenantPrisma().runInTenantContext(ctx, (tx) =>
      tx.installment.findMany({
        where: {
          ...(query.patientId ? { receivable: { patientId: query.patientId } } : {}),
          ...(query.status === 'OVERDUE'
            ? {
                OR: [
                  { status: 'OVERDUE' },
                  { status: { in: ['OPEN', 'PARTIALLY_PAID'] }, dueDate: { lt: todayDate } },
                ],
              }
            : query.status === 'OPEN'
              ? { status: 'OPEN', dueDate: { gte: todayDate } }
              : query.status
                ? { status: query.status }
                : {}),
          ...(dueFrom || dueTo
            ? {
                dueDate: {
                  ...(dueFrom ? { gte: dueFrom } : {}),
                  ...(dueTo ? { lte: dueTo } : {}),
                },
              }
            : {}),
          ...(query.cursor ? { id: { lt: query.cursor } } : {}),
        },
        include: { receivable: { select: { patientId: true, unitId: true } } },
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
        take: limit + 1,
      }),
    );

    const page = rows.slice(0, limit);
    const next = rows.length > limit ? page[page.length - 1]?.id ?? null : null;
    return {
      items: page.map((row) => {
        const dto = toInstallmentDto(row);
        return { ...dto, status: effectiveInstallmentStatus(dto.status, dto.dueDate, today) };
      }),
      nextCursor: next,
    };
  }
}
