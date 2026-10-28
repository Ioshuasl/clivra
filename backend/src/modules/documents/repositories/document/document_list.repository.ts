import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { DocumentKind } from '../../enum/document/document_kind.enum.js';
import type { DocumentSummary } from '../../types/document/document.types.js';
import { mapDocumentSummary } from './mappers/document.mapper.js';

export class ListRepository {
  async execute(
    ctx: RequestContext,
    patientId: string,
    kinds: readonly DocumentKind[],
  ): Promise<DocumentSummary[]> {
    if (kinds.length === 0) return [];
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const rows = await tx.document.findMany({
        where: { tenantId: ctx.tenantId, patientId, kind: { in: [...kinds] } },
        orderBy: { issuedAt: 'desc' },
        include: { signatures: { orderBy: { signedAt: 'asc' } } },
      });
      return rows.map(mapDocumentSummary);
    });
  }
}
