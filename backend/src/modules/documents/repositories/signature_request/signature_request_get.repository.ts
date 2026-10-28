import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { PatientSignatureMethod } from '../../enum/signature/patient_signature_method.enum.js';
import type { SignatureRequestState } from '../../types/signature_request/signature_request.types.js';

export class GetRepository {
  async execute(ctx: RequestContext, requestId: string): Promise<SignatureRequestState | null> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const row = await tx.documentSignatureRequest.findFirst({
        where: { id: requestId, tenantId: ctx.tenantId },
      });
      if (!row) return null;
      return {
        id: row.id,
        tenantId: row.tenantId,
        documentId: row.documentId,
        method: row.method as PatientSignatureMethod,
        expiresAt: row.expiresAt,
        usedAt: row.usedAt,
        revokedAt: row.revokedAt,
        codeHash: row.codeHash,
        codeExpiresAt: row.codeExpiresAt,
        codeAttempts: row.codeAttempts,
        codeSentVia: row.codeSentVia === 'WHATSAPP' || row.codeSentVia === 'EMAIL' ? row.codeSentVia : null,
      };
    });
  }
}
