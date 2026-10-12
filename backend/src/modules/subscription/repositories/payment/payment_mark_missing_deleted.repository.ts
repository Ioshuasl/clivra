import type { DbTransaction } from '../../../../shared/database/db_transaction.js';

export class MarkMissingPaymentsDeletedRepository {
  /** Cobranças locais que o Asaas não lista mais (removidas lá) deixam de contar no estado. */
  async execute(
    tx: DbTransaction,
    subscriptionId: string,
    remoteExternalIds: readonly string[],
  ): Promise<number> {
    const res = await tx.subscriptionPayment.updateMany({
      where: {
        subscriptionId,
        deleted: false,
        externalPaymentId: { notIn: [...remoteExternalIds] },
      },
      data: { deleted: true },
    });
    return res.count;
  }
}
