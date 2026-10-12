/**
 * Ops: reconcilia a assinatura de um tenant com o Asaas (corrige o espelho e recalcula o status).
 * Use depois de a fila do webhook ter ficado pausada ou para conferir uma divergência.
 *
 * Uso: pnpm --filter @repo/backend exec tsx scripts/ops-asaas-reconcile.ts <tenantId>
 *      pnpm --filter @repo/backend exec tsx scripts/ops-asaas-reconcile.ts --all
 * Requer BILLING_PROVIDER=asaas e as variáveis ASAAS_* do ambiente alvo (ADR-0017).
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Uso: tsx scripts/ops-asaas-reconcile.ts <tenantId>|--all');
    process.exit(1);
  }

  const { getPrismaClient } = await import('../src/shared/database/tenant_prisma.js');
  const { ReconcileAction } = await import('../src/modules/subscription/actions/subscription/subscription_reconcile.action.js');
  const { listTenantsWithAsaasSubscription } = await import('../src/modules/subscription/subscription_public.js');
  const { sweepStuckAsaasEvents } = await import('../src/modules/subscription/jobs/process_asaas_event.job.js');

  const tenants = arg === '--all' ? await listTenantsWithAsaasSubscription() : [arg];
  if (arg === '--all') {
    console.log(`Eventos presos reprocessados: ${await sweepStuckAsaasEvents()}`);
  }

  let failed = 0;
  for (const tenantId of tenants) {
    try {
      const summary = await new ReconcileAction().execute({
        tenantId,
        userId: SYSTEM_USER_ID,
        requestId: `ops-asaas-reconcile:${Date.now()}`,
      });
      console.log(
        `${tenantId}: checked=${summary.checked} divergences=${summary.divergences} status=${summary.statusFrom}→${summary.statusTo}`,
      );
    } catch (err) {
      failed += 1;
      console.error(`${tenantId}: falhou — ${err instanceof Error ? err.message : 'erro desconhecido'}`);
    }
  }

  await getPrismaClient().$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

void main();
