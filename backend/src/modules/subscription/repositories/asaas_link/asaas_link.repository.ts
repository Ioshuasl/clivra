import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../../shared/database/tenant_prisma.js';

type LinkRow = { tenant_id: string };

/**
 * Vínculo tenant ↔ ids do Asaas em `platform.asaas_link` (sem RLS de tenant):
 * o webhook chega sem contexto de tenant e precisa descobrir de quem é o evento.
 */
export class AsaasLinkRepository {
  async upsertCustomer(tenantId: string, customerId: string): Promise<void> {
    await getPrismaClient().$executeRaw(Prisma.sql`
      INSERT INTO platform.asaas_link (tenant_id, external_customer_id)
      VALUES (${tenantId}::uuid, ${customerId})
      ON CONFLICT (tenant_id) DO UPDATE
        SET external_customer_id = COALESCE(platform.asaas_link.external_customer_id, EXCLUDED.external_customer_id),
            updated_at = NOW()
    `);
  }

  async setSubscription(tenantId: string, subscriptionId: string, customerId?: string | null): Promise<void> {
    await getPrismaClient().$executeRaw(Prisma.sql`
      INSERT INTO platform.asaas_link (tenant_id, external_customer_id, external_subscription_id)
      VALUES (${tenantId}::uuid, ${customerId ?? null}, ${subscriptionId})
      ON CONFLICT (tenant_id) DO UPDATE
        SET external_subscription_id = EXCLUDED.external_subscription_id,
            external_customer_id = COALESCE(platform.asaas_link.external_customer_id, EXCLUDED.external_customer_id),
            updated_at = NOW()
    `);
  }

  async addCheckout(tenantId: string, checkoutId: string): Promise<void> {
    await getPrismaClient().$executeRaw(Prisma.sql`
      INSERT INTO platform.asaas_checkout_link (external_checkout_id, tenant_id)
      VALUES (${checkoutId}, ${tenantId}::uuid)
      ON CONFLICT (external_checkout_id) DO NOTHING
    `);
  }

  async findTenantByCheckout(checkoutId: string): Promise<string | null> {
    const rows = await getPrismaClient().$queryRaw<LinkRow[]>(Prisma.sql`
      SELECT tenant_id FROM platform.asaas_checkout_link WHERE external_checkout_id = ${checkoutId} LIMIT 1
    `);
    return rows[0]?.tenant_id ?? null;
  }

  async findTenantBySubscription(subscriptionId: string): Promise<string | null> {
    const rows = await getPrismaClient().$queryRaw<LinkRow[]>(Prisma.sql`
      SELECT tenant_id FROM platform.asaas_link WHERE external_subscription_id = ${subscriptionId} LIMIT 1
    `);
    return rows[0]?.tenant_id ?? null;
  }

  async findTenantByCustomer(customerId: string): Promise<string | null> {
    const rows = await getPrismaClient().$queryRaw<LinkRow[]>(Prisma.sql`
      SELECT tenant_id FROM platform.asaas_link WHERE external_customer_id = ${customerId} LIMIT 1
    `);
    return rows[0]?.tenant_id ?? null;
  }

  /** Tenants com assinatura no Asaas (insumo do job de reconciliação). */
  async listTenantsWithSubscription(): Promise<string[]> {
    const rows = await getPrismaClient().$queryRaw<LinkRow[]>(Prisma.sql`
      SELECT tenant_id FROM platform.asaas_link WHERE external_subscription_id IS NOT NULL
    `);
    return rows.map((row) => row.tenant_id);
  }

  async tenantExists(tenantId: string): Promise<boolean> {
    return getPrismaClient().$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.provisioning', 'on', true)`;
      const found = await tx.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
      return found !== null;
    });
  }
}
