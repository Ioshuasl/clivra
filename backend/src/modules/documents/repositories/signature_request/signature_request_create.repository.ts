import type { RequestContext } from '../../../../shared/domain/request_context.js';
import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import type { PatientSignatureMethod } from '../../enum/signature/patient_signature_method.enum.js';

export type SignatureRequestInsert = {
  id: string;
  documentId: string;
  tokenHash: string;
  method: PatientSignatureMethod;
  expiresAt: Date;
};

/** Um pedido novo invalida os links anteriores ainda abertos do mesmo documento. */
export class CreateRepository {
  async executeInTx(tx: DbTransaction, ctx: RequestContext, request: SignatureRequestInsert): Promise<void> {
    await tx.documentSignatureRequest.updateMany({
      where: {
        tenantId: ctx.tenantId,
        documentId: request.documentId,
        usedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    await tx.documentSignatureRequest.create({
      data: {
        id: request.id,
        tenantId: ctx.tenantId,
        documentId: request.documentId,
        tokenHash: request.tokenHash,
        method: request.method,
        expiresAt: request.expiresAt,
        createdBy: ctx.userId,
      },
    });
  }
}
