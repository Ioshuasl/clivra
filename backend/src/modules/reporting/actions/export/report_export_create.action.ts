import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';
import type { ExportFormat } from '../../enum/report/export_format.enum.js';
import type { ExportableReport } from '../../enum/report/exportable_report.enum.js';
import { CreateRepository } from '../../repositories/export/report_export_create.repository.js';
import type {
  ReportExportCreateResult,
  ReportExportFilters,
} from '../../types/export/report_export.types.js';

export type CreateExportInput = {
  report: ExportableReport;
  format: ExportFormat;
  filters: ReportExportFilters;
};

export class CreateAction {
  constructor(
    private readonly create = new CreateRepository(),
    private readonly uow = new UnitOfWork(),
  ) {}

  async execute(ctx: RequestContext, input: CreateExportInput): Promise<ReportExportCreateResult> {
    const id = idGenerator.next();
    return this.uow.run(ctx, async ({ tx, publish }) => {
      const row = await this.create.executeInTx(tx, ctx, {
        id,
        report: input.report,
        format: input.format,
        filters: input.filters,
        requestedBy: ctx.userId,
      });
      publish([
        {
          name: 'reporting.export_requested',
          payload: {
            exportId: row.id,
            requestId: ctx.requestId,
          },
        },
      ]);
      return { exportId: row.id, status: row.status };
    });
  }
}
