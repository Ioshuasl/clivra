import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { ReportExportDto } from '../../types/export/report_export.types.js';
import { toDto } from './mappers/report_export.mapper.js';

export class GetRepository {
  async execute(ctx: RequestContext, exportId: string): Promise<ReportExportDto | null> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const row = await tx.reportExport.findFirst({
        where: { id: exportId },
      });
      return row ? toDto(row) : null;
    });
  }
}
