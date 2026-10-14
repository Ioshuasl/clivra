import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { AuditAction, writeAuditLogSafe } from '../../../../shared/database/write_audit.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import { assertPlanLimit, UsageMetric } from '../../../subscription/subscription_public.js';
import { CreateAction } from '../../actions/invitation/invitation_create.action.js';
import {
  GetByUserAndTenantRepository,
  GetByEmailInTenantRepository,
} from '../../repositories/membership/membership.repository.js';
import { GetPendingByEmailRepository } from '../../repositories/invitation/invitation.repository.js';
import type { InvitationCreateSchema } from '../../schemas/invitation.schema.js';
import type { InvitationSummary } from '../../types/auth.types.js';

const ADMIN_ROLES = new Set(['OWNER', 'RECEPTION', 'ASSISTANT', 'FINANCE']);

export class CreateService {
  constructor(
    private readonly getMembership = new GetByUserAndTenantRepository(),
    private readonly getMemberByEmail = new GetByEmailInTenantRepository(),
    private readonly getPending = new GetPendingByEmailRepository(),
    private readonly createAction = new CreateAction(),
  ) {}

  async execute(
    ctx: RequestContext,
    invitationSchema: InvitationCreateSchema,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<InvitationSummary> {
    const email = invitationSchema.email.toLowerCase();
    const existingMember = await this.getMemberByEmail.execute(ctx, email);
    if (existingMember?.active) {
      throw new AppError(
        'DUPLICATE_RESOURCE',
        'Este e-mail já possui acesso a esta clínica.',
        409,
      );
    }

    const pending = await this.getPending.execute(ctx, email);
    if (pending) {
      throw new AppError(
        'DUPLICATE_RESOURCE',
        'Já existe um convite pendente para este e-mail.',
        409,
      );
    }

    const actor = await this.getMembership.execute(ctx.userId, ctx.tenantId);
    const clinicName = actor?.tenant.name ?? 'sua clínica';

    if (ADMIN_ROLES.has(invitationSchema.role)) {
      await assertPlanLimit(ctx, UsageMetric.ADMIN_USERS);
    }

    const created = await this.createAction.execute(
      ctx,
      { ...invitationSchema, email },
      clinicName,
    );

    await writeAuditLogSafe({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: AuditAction.MEMBER_INVITED,
      resourceType: 'invitation',
      resourceId: created.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { email, role: invitationSchema.role },
    });

    return created;
  }
}
