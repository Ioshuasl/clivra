import type { Prisma } from '@prisma/client';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import { mapWaitlist } from '../../helpers/waitlist.helper.js';
import type { WaitlistPreferredPeriod, WaitlistSummary } from '../../types/waitlist.types.js';

const waitlistInclude = {
  patient: { select: { id: true, name: true, phonePrimary: true } },
  professional: {
    select: {
      id: true,
      membership: { select: { user: { select: { name: true } } } },
    },
  },
  procedure: { select: { id: true, name: true, defaultMinutes: true } },
} satisfies Prisma.WaitlistEntryInclude;

export class CreateRepository {
  async execute(
    ctx: RequestContext,
    input: {
      unitId: string;
      patientId: string;
      professionalId?: string | null;
      procedureId: string;
      preferredPeriods: WaitlistPreferredPeriod[];
      priority: number;
    },
  ): Promise<WaitlistSummary> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const patient = await tx.patient.findFirst({
        where: { id: input.patientId, tenantId: ctx.tenantId, deletedAt: null, active: true },
        select: { id: true, unitId: true },
      });
      if (!patient) {
        throw new AppError('VALIDATION_ERROR', 'Paciente não encontrado.', 400);
      }

      const procedure = await tx.procedure.findFirst({
        where: { id: input.procedureId, tenantId: ctx.tenantId, active: true },
        select: { id: true },
      });
      if (!procedure) {
        throw new AppError('VALIDATION_ERROR', 'Procedimento não encontrado.', 400);
      }

      if (input.professionalId) {
        const professional = await tx.professional.findFirst({
          where: { id: input.professionalId, tenantId: ctx.tenantId, active: true },
          select: { id: true },
        });
        if (!professional) {
          throw new AppError('VALIDATION_ERROR', 'Profissional não encontrado.', 400);
        }
      }

      const row = await tx.waitlistEntry.create({
        data: {
          id: idGenerator.next(),
          tenantId: ctx.tenantId,
          unitId: input.unitId,
          patientId: input.patientId,
          professionalId: input.professionalId ?? null,
          procedureId: input.procedureId,
          preferredPeriods: input.preferredPeriods,
          priority: input.priority,
          status: 'WAITING',
        },
        include: waitlistInclude,
      });
      return mapWaitlist(row);
    });
  }
}
