import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';

/** Conta a tentativa em transação própria: o erro do paciente precisa ficar registrado. */
export class RegisterAttemptRepository {
  async execute(ctx: RequestContext, requestId: string): Promise<number> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const row = await tx.documentSignatureRequest.update({
        where: { id: requestId },
        data: { codeAttempts: { increment: 1 } },
        select: { codeAttempts: true },
      });
      return row.codeAttempts;
    });
  }
}
