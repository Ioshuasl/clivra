import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import { AuditAction, writeAuditLogSafe } from '../../../../shared/database/write_audit.js';
import { DocumentAlreadyCancelledError } from '../../models/errors/documents.errors.js';
import { CancelRepository } from '../../repositories/document/document_cancel.repository.js';

/** Cancela o documento (nunca apaga) e registra auditoria. */
export class CancelAction {
  constructor(
    private readonly uow = new UnitOfWork(),
    private readonly cancelDocument = new CancelRepository(),
  ) {}

  async execute(
    ctx: RequestContext,
    document: { id: string; patientId: string; kind: string },
    reason: string,
    extra?: { ip?: string },
  ): Promise<void> {
    const cancelled = await this.uow.run(ctx, ({ tx }) =>
      this.cancelDocument.executeInTx(tx, ctx, document.id, reason),
    );
    if (!cancelled) throw new DocumentAlreadyCancelledError();

    await writeAuditLogSafe({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: AuditAction.DOCUMENT_CANCELLED,
      resourceType: 'document',
      resourceId: document.id,
      patientId: document.patientId,
      ipAddress: extra?.ip,
      metadata: { kind: document.kind },
    });
  }
}
