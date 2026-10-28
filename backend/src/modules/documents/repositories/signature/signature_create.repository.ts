import type { Prisma } from '@prisma/client';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import type { DocumentSignatureRow } from '../../types/signature/signature.types.js';

export class CreateRepository {
  async executeInTx(
    tx: DbTransaction,
    ctx: RequestContext,
    signature: DocumentSignatureRow,
  ): Promise<void> {
    await tx.documentSignature.create({
      data: {
        id: signature.id,
        tenantId: ctx.tenantId,
        documentId: signature.documentId,
        signerType: signature.signerType,
        method: signature.method,
        professionalId: signature.professionalId,
        signerName: signature.signerName,
        certificateSubject: signature.certificateSubject,
        certificateSerial: signature.certificateSerial,
        certificateNotAfter: signature.certificateNotAfter,
        signedPdfKey: signature.signedPdfKey,
        signedPdfSha256: signature.signedPdfSha256,
        evidence: (signature.evidence ?? undefined) as Prisma.InputJsonValue | undefined,
        signedAt: signature.signedAt,
      },
    });
  }
}
