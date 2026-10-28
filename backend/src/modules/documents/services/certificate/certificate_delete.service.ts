import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { AuditAction, writeAuditLogSafe } from '../../../../shared/database/write_audit.js';
import { DeleteRepository } from '../../repositories/certificate/certificate_delete.repository.js';
import { ResolveProfessionalService } from './certificate_resolve_professional.service.js';

export class DeleteService {
  constructor(
    private readonly resolveProfessional = new ResolveProfessionalService(),
    private readonly deleteCertificate = new DeleteRepository(),
  ) {}

  async execute(ctx: RequestContext, extra?: { ip?: string }): Promise<void> {
    const professional = await this.resolveProfessional.execute(ctx);
    const removed = await this.deleteCertificate.execute(ctx, professional.id);
    if (!removed) return;
    await writeAuditLogSafe({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: AuditAction.CERTIFICATE_REMOVED,
      resourceType: 'professional_certificate',
      resourceId: professional.id,
      ipAddress: extra?.ip,
    });
  }
}
