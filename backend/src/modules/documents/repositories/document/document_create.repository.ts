import type { Prisma } from '@prisma/client';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import type { DocumentIssueRow } from '../../types/document/document.types.js';

export class CreateRepository {
  async executeInTx(tx: DbTransaction, ctx: RequestContext, issue: DocumentIssueRow): Promise<void> {
    await tx.document.create({
      data: {
        id: issue.id,
        tenantId: ctx.tenantId,
        patientId: issue.patientId,
        professionalId: issue.professionalId,
        templateId: issue.templateId,
        kind: issue.kind,
        title: issue.title,
        content: issue.content as unknown as Prisma.InputJsonValue,
        contentHash: issue.contentHash,
        status: issue.status,
        professionalSignature: issue.professionalSignature,
        patientSignature: issue.patientSignature,
        version: issue.version,
        supersedesId: issue.supersedesId,
        amendReason: issue.amendReason,
        quoteId: issue.quoteId,
        issuedBy: issue.issuedBy,
      },
    });
  }
}
