import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { BillingProfile } from '../../types/billing/subscription_payment.types.js';

/** Dados do tenant e do Owner necessários para cadastrar o cliente no gateway e avisar por e-mail. */
export class GetBillingProfileRepository {
  async execute(ctx: RequestContext): Promise<BillingProfile | null> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { name: true, legalName: true, taxId: true, timezone: true },
      });
      if (!tenant) return null;
      const owner = await tx.membership.findFirst({
        where: { tenantId: ctx.tenantId, role: 'OWNER', active: true },
        select: { user: { select: { name: true, email: true, phone: true } } },
      });
      if (!owner?.user) return null;
      return {
        tenantName: tenant.name,
        legalName: tenant.legalName,
        taxId: tenant.taxId,
        timezone: tenant.timezone,
        ownerName: owner.user.name,
        ownerEmail: owner.user.email,
        ownerPhone: owner.user.phone,
      };
    });
  }
}
