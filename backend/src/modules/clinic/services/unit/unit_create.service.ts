import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';
import { DuplicateNameError } from '../../models/errors/clinic.errors.js';
import { FindByNameRepository, seedDefaultHoursForUnit } from '../../repositories/unit/unit.repository.js';
import type { UnitCreateSchema } from '../../schemas/clinic.schema.js';
import type { ClinicAddress, UnitSummary } from '../../types/clinic.types.js';
import { assertCanAdd, UsageMetric } from '../../../subscription/subscription_public.js';

function mapAddress(value: unknown): ClinicAddress | null {
  if (!value || typeof value !== 'object') return null;
  return value;
}

export class CreateService {
  constructor(private readonly findByName = new FindByNameRepository()) {}

  async execute(ctx: RequestContext, unitSchema: UnitCreateSchema): Promise<UnitSummary> {
    const duplicate = await this.findByName.execute(ctx, unitSchema.name);
    if (duplicate) {
      throw new DuplicateNameError('Unidade', unitSchema.name);
    }

    await assertCanAdd(ctx, UsageMetric.UNITS);

    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const id = idGenerator.next();

      if (unitSchema.isDefault) {
        await tx.unit.updateMany({
          where: { tenantId: ctx.tenantId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const unit = await tx.unit.create({
        data: {
          id,
          tenantId: ctx.tenantId,
          name: unitSchema.name,
          phone: unitSchema.phone ?? null,
          address: unitSchema.address ?? undefined,
          isDefault: unitSchema.isDefault ?? false,
        },
        select: { id: true, name: true, isDefault: true, phone: true, address: true },
      });

      await seedDefaultHoursForUnit(tx, ctx.tenantId, unit.id);

      return {
        id: unit.id,
        name: unit.name,
        isDefault: unit.isDefault,
        phone: unit.phone,
        address: mapAddress(unit.address),
      };
    });
  }
}
