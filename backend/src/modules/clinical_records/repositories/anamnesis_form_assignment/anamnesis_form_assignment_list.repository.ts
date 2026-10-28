import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { AnamnesisFormAssignmentSummary } from '../../types/anamnesis_form/anamnesis_form_assignment.types.js';

export class ListRepository {
  async execute(ctx: RequestContext): Promise<AnamnesisFormAssignmentSummary[]> {
    const rows = await getTenantPrisma().runInTenantContext(ctx, (tx) =>
      tx.anamnesisFormAssignment.findMany({ where: { tenantId: ctx.tenantId } }),
    );
    return rows.map((row) => ({ professionalId: row.professionalId, formName: row.formName }));
  }
}
