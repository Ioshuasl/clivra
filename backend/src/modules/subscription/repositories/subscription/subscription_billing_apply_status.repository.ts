import type { DbTransaction } from '../../../../shared/database/db_transaction.js';

/** Aplica a transição de status derivada da cobrança (mantém `tenant.status` em sincronia). */
export class ApplyBillingStatusRepository {
  async execute(
    tx: DbTransaction,
    input: {
      tenantId: string;
      subscriptionId: string;
      status: string;
      planId?: string;
      currentPeriodEnd?: Date | null;
      cancelAt?: Date | null;
    },
  ): Promise<void> {
    await tx.subscription.update({
      where: { id: input.subscriptionId },
      data: {
        status: input.status,
        ...(input.planId ? { planId: input.planId } : {}),
        ...(input.currentPeriodEnd !== undefined ? { currentPeriodEnd: input.currentPeriodEnd } : {}),
        ...(input.cancelAt !== undefined ? { cancelAt: input.cancelAt } : {}),
      },
    });
    await tx.tenant.update({ where: { id: input.tenantId }, data: { status: input.status } });
  }
}
