import { getPrismaClient } from '../../../../shared/database/tenant_prisma.js';
import type { PatientSignatureMethod } from '../../enum/signature/patient_signature_method.enum.js';
import type { SignatureRequestLookup } from '../../types/signature_request/signature_request.types.js';

/** Resolve o link público sem conhecer a clínica (função segura do banco, só por hash). */
export class ResolveRepository {
  async execute(tokenHash: string): Promise<SignatureRequestLookup | null> {
    const rows = await getPrismaClient().$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        document_id: string;
        method: string;
        expires_at: Date;
        used_at: Date | null;
        revoked_at: Date | null;
      }>
    >`SELECT * FROM platform.resolve_document_signature_request(${tokenHash})`;
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      tenantId: row.tenant_id,
      documentId: row.document_id,
      method: row.method as PatientSignatureMethod,
      expiresAt: row.expires_at,
      usedAt: row.used_at,
      revokedAt: row.revoked_at,
    };
  }
}
