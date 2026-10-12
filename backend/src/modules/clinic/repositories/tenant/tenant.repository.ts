import type { Prisma } from '@prisma/client';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { ClinicAddress, ClinicProfile, OnboardingState } from '../../types/clinic.types.js';

const tenantSelect = {
  id: true,
  name: true,
  slug: true,
  legalName: true,
  taxId: true,
  responsibleCro: true,
  timezone: true,
  acceptedPaymentMethods: true,
  onboarding: true,
} as const;

function mapAddress(value: unknown): ClinicAddress | null {
  if (!value || typeof value !== 'object') return null;
  return value;
}

export class GetProfileRepository {
  async execute(ctx: RequestContext): Promise<ClinicProfile | null> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: tenantSelect,
      });
      if (!tenant) return null;

      const defaultUnit = await tx.unit.findFirst({
        where: { tenantId: ctx.tenantId, isDefault: true },
        select: { id: true, name: true, phone: true, address: true },
      });

      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        legalName: tenant.legalName,
        taxId: tenant.taxId,
        responsibleCro: tenant.responsibleCro,
        timezone: tenant.timezone,
        acceptedPaymentMethods: tenant.acceptedPaymentMethods,
        defaultUnit: defaultUnit
          ? {
              id: defaultUnit.id,
              name: defaultUnit.name,
              phone: defaultUnit.phone,
              address: mapAddress(defaultUnit.address),
            }
          : null,
      };
    });
  }
}

export class UpdateProfileRepository {
  async execute(
    ctx: RequestContext,
    data: {
      name?: string;
      legalName?: string | null;
      taxId?: string | null;
      responsibleCro?: string | null;
      timezone?: string;
      acceptedPaymentMethods?: string[];
    },
  ): Promise<void> {
    const tenantPrisma = getTenantPrisma();
    await tenantPrisma.runInTenantContext(ctx, async (tx) => {
      await tx.tenant.update({
        where: { id: ctx.tenantId },
        data,
      });
    });
  }
}

export class UpdateDefaultUnitContactRepository {
  async execute(
    ctx: RequestContext,
    input: { phone?: string | null; address?: ClinicAddress | null },
  ): Promise<void> {
    const tenantPrisma = getTenantPrisma();
    await tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const defaultUnit = await tx.unit.findFirst({
        where: { tenantId: ctx.tenantId, isDefault: true },
        select: { id: true },
      });
      if (!defaultUnit) return;
      await tx.unit.update({
        where: { id: defaultUnit.id },
        data: {
          phone: input.phone,
          address:
            input.address === undefined
              ? undefined
              : ((input.address ?? undefined) as Prisma.InputJsonValue | undefined),
        },
      });
    });
  }
}

export class GetOnboardingRepository {
  async execute(ctx: RequestContext): Promise<{ slug: string; onboarding: OnboardingState } | null> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { slug: true, onboarding: true },
      });
      if (!tenant) return null;
      const raw = tenant.onboarding as { skippedSteps?: string[] };
      return {
        slug: tenant.slug,
        onboarding: { skippedSteps: raw.skippedSteps ?? [] },
      };
    });
  }
}

export class UpdateOnboardingRepository {
  async execute(ctx: RequestContext, onboarding: OnboardingState): Promise<void> {
    const tenantPrisma = getTenantPrisma();
    await tenantPrisma.runInTenantContext(ctx, async (tx) => {
      await tx.tenant.update({
        where: { id: ctx.tenantId },
        data: { onboarding: onboarding },
      });
    });
  }
}

export class CountMembershipsRepository {
  async execute(ctx: RequestContext): Promise<number> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) =>
      tx.membership.count({ where: { tenantId: ctx.tenantId, active: true } }),
    );
  }
}

export class HasBusinessHoursRepository {
  async execute(ctx: RequestContext): Promise<boolean> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const count = await tx.businessHours.count({ where: { tenantId: ctx.tenantId } });
      return count > 0;
    });
  }
}

export class HasActiveProceduresRepository {
  async execute(ctx: RequestContext): Promise<boolean> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const count = await tx.procedure.count({
        where: { tenantId: ctx.tenantId, active: true },
      });
      return count > 0;
    });
  }
}

export class HasActiveProfessionalsRepository {
  async execute(ctx: RequestContext): Promise<boolean> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const count = await tx.professional.count({
        where: { tenantId: ctx.tenantId, active: true },
      });
      return count > 0;
    });
  }
}

export class IsProfileCompleteRepository {
  async execute(ctx: RequestContext): Promise<boolean> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { legalName: true, taxId: true, responsibleCro: true },
      });
      if (!tenant?.legalName && !tenant?.taxId && !tenant?.responsibleCro) {
        return false;
      }
      const defaultUnit = await tx.unit.findFirst({
        where: { tenantId: ctx.tenantId, isDefault: true },
        select: { phone: true, address: true },
      });
      return Boolean(defaultUnit?.phone || defaultUnit?.address);
    });
  }
}
