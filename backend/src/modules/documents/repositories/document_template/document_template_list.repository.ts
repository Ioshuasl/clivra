import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { DocumentTemplateListQuerySchema } from '../../schemas/document_template.schema.js';
import type { DocumentTemplateSummary } from '../../types/document_template/document_template.types.js';
import { mapDocumentTemplate } from './mappers/document_template.mapper.js';

export class ListRepository {
  async execute(
    ctx: RequestContext,
    querySchema: DocumentTemplateListQuerySchema,
  ): Promise<DocumentTemplateSummary[]> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const rows = await tx.documentTemplate.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(querySchema.kind ? { kind: querySchema.kind } : {}),
          ...(querySchema.includeInactive ? {} : { active: true }),
        },
        orderBy: [{ kind: 'asc' }, { name: 'asc' }],
      });
      return rows.map(mapDocumentTemplate);
    });
  }
}
