import { config } from 'dotenv';
import { resolve } from 'node:path';
import { getPrismaClient } from '../src/shared/database/tenant_prisma.js';
import { OPS_SUBSCRIPTION_STATUSES } from '../src/modules/subscription/enum/subscription/subscription_status.enum.js';
import { PLAN_CODES } from '../src/modules/subscription/enum/plan/plan_code.enum.js';
import { UpdateService } from '../src/modules/subscription/services/subscription/subscription_ops.service.js';
import type { PlanCode } from '../src/modules/subscription/enum/plan/plan_code.enum.js';
import type { SubscriptionStatus } from '../src/modules/subscription/enum/subscription/subscription_status.enum.js';

config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0) return process.argv[idx + 1];
  return undefined;
}

async function main(): Promise<void> {
  const tenantId = arg('tenant');
  const status = arg('status') as SubscriptionStatus | undefined;
  const planCode = arg('plan') as PlanCode | undefined;

  if (!tenantId || (!status && !planCode)) {
    console.error(
      'Uso: tsx scripts/ops-subscription-status.ts --tenant <uuid> --status ACTIVE|SUSPENDED|EXPIRED [--plan ESSENCIAL|CLINICA|REDE]',
    );
    process.exit(1);
  }

  if (status && !(OPS_SUBSCRIPTION_STATUSES as readonly string[]).includes(status)) {
    console.error('status inválido. Use ACTIVE, SUSPENDED ou EXPIRED.');
    process.exit(1);
  }
  if (planCode && !(PLAN_CODES as readonly string[]).includes(planCode)) {
    console.error('plan inválido. Use ESSENCIAL, CLINICA ou REDE.');
    process.exit(1);
  }

  const updated = await new UpdateService().execute(
    { tenantId, userId: '', requestId: 'ops-subscription' },
    { status, planCode },
  );
  console.log(
    JSON.stringify({
      tenantId: updated.tenantId,
      status: updated.status,
      plan: updated.plan.code,
    }),
  );
  await getPrismaClient().$disconnect();
}

void main().catch(async (err) => {
  console.error(err);
  await getPrismaClient().$disconnect();
  process.exit(1);
});
