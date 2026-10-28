import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';

export type TreatmentItemCreateInput = {
  patientId: string;
  procedureId: string;
  toothCode: string | null;
  face: string | null;
  priceCents: number;
  professionalId: string | null;
};

export class CreateRepository {
  /** Adiciona o item ao plano ativo do paciente; cria o plano (sem orçamento) se ainda não existir. */
  async execute(
    ctx: RequestContext,
    treatmentItemSchema: TreatmentItemCreateInput,
  ): Promise<{ planId: string; itemId: string }> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const active = await tx.treatmentPlan.findFirst({
        where: { patientId: treatmentItemSchema.patientId, status: 'ACTIVE' },
        orderBy: { startedAt: 'desc' },
        select: { id: true },
      });
      const planId = active?.id ?? idGenerator.next();
      if (!active) {
        await tx.treatmentPlan.create({
          data: {
            id: planId,
            tenantId: ctx.tenantId,
            patientId: treatmentItemSchema.patientId,
            status: 'ACTIVE',
          },
        });
      }
      const itemId = idGenerator.next();
      await tx.treatmentItem.create({
        data: {
          id: itemId,
          tenantId: ctx.tenantId,
          treatmentPlanId: planId,
          procedureId: treatmentItemSchema.procedureId,
          toothCode: treatmentItemSchema.toothCode,
          face: treatmentItemSchema.face,
          priceCents: BigInt(treatmentItemSchema.priceCents),
          status: 'PLANNED',
          professionalId: treatmentItemSchema.professionalId,
        },
      });
      return { planId, itemId };
    });
  }
}
