import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { DocumentRecord } from '../../types/document/document.types.js';
import { mapDocumentRecord } from './mappers/document.mapper.js';

export class GetRepository {
  async execute(ctx: RequestContext, documentId: string): Promise<DocumentRecord | null> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const row = await tx.document.findFirst({
        where: { id: documentId, tenantId: ctx.tenantId },
        include: { signatures: { orderBy: { signedAt: 'asc' } } },
      });
      return row ? mapDocumentRecord(row) : null;
    });
  }
}
