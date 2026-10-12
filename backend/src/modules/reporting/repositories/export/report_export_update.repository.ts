import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { ExportStatus } from '../../enum/report/export_status.enum.js';
import type { ReportExportDto } from '../../types/export/report_export.types.js';
import { toDto } from './mappers/report_export.mapper.js';

export type UpdateExportStatusInput = {
  status: ExportStatus;
  storageKey?: string | null;
  error?: string | null;
  completedAt?: Date | null;
};

export class UpdateRepository {
  async execute(
    ctx: RequestContext,
    exportId: string,
    input: UpdateExportStatusInput,
  ): Promise<ReportExportDto | null> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const existing = await tx.reportExport.findFirst({ where: { id: exportId } });
      if (!existing) return null;

      const row = await tx.reportExport.update({
        where: { id: exportId },
        data: {
          status: input.status,
          ...(input.storageKey !== undefined ? { storageKey: input.storageKey } : {}),
          ...(input.error !== undefined ? { error: input.error } : {}),
          ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
        },
      });
      return toDto(row);
    });
  }
}
