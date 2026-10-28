import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { DocumentTemplateSummary } from '../../types/document_template/document_template.types.js';
import { mapDocumentTemplate } from './mappers/document_template.mapper.js';

export class GetRepository {
  async execute(ctx: RequestContext, templateId: string): Promise<DocumentTemplateSummary | null> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const row = await tx.documentTemplate.findFirst({
        where: { id: templateId, tenantId: ctx.tenantId },
      });
      return row ? mapDocumentTemplate(row) : null;
    });
  }
}
