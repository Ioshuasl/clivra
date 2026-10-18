import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import {
  CashSessionNotFoundError,
  DifferenceReasonRequiredError,
  IdempotencyKeyReusedError,
  RecordImmutableError,
} from '../../models/errors/billing.errors.js';
import {
  closePayloadMatches,
  differenceCents,
  expectedByMethod,
  type MethodCents,
} from '../../models/cash_session.model.js';
import { CloseRepository } from '../../repositories/cash_session/cash_session_close.repository.js';
import {
  FindByCloseIdempotencyRepository,
  GetRepository,
} from '../../repositories/cash_session/cash_session_get.repository.js';
import type { CashSessionCloseSchema } from '../../schemas/billing.schema.js';
import type { CashSessionDto } from '../../types/cash_session/cash_session.types.js';

function isUniqueConflict(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = String((err as { code?: string }).code ?? '');
  const message = String((err as { message?: string }).message ?? '');
  return code === 'P2002' || code === '23505' || message.includes('Unique constraint');
}

function countedFromSchema(cashSessionCloseSchema: CashSessionCloseSchema): MethodCents[] {
  return cashSessionCloseSchema.countedByMethod.map((row) => ({
    method: row.method,
    amountCents: BigInt(row.countedCents),
  }));
}

function countedFromDto(session: CashSessionDto): MethodCents[] {
  return (session.countedByMethod ?? []).map((row) => ({
    method: row.method,
    amountCents: BigInt(row.countedCents),
  }));
}

function incomingMatchesSession(session: CashSessionDto, cashSessionCloseSchema: CashSessionCloseSchema): boolean {
  return closePayloadMatches(
    {
      countedByMethod: countedFromDto(session),
      differenceReason: session.differenceReason,
    },
    {
      countedByMethod: countedFromSchema(cashSessionCloseSchema),
      differenceReason: cashSessionCloseSchema.differenceReason ?? null,
    },
  );
}

export class CloseAction {
  constructor(
    private readonly findCloseKey = new FindByCloseIdempotencyRepository(),
    private readonly get = new GetRepository(),
    private readonly close = new CloseRepository(),
    private readonly uow = new UnitOfWork(),
  ) {}

  async execute(
    ctx: RequestContext,
    sessionId: string,
    cashSessionCloseSchema: CashSessionCloseSchema,
    idempotencyKey: string,
  ): Promise<CashSessionDto> {
    const existingByKey = await this.findCloseKey.execute(ctx, idempotencyKey);
    if (existingByKey && existingByKey.id !== sessionId) throw new IdempotencyKeyReusedError();
    if (existingByKey) {
      if (!incomingMatchesSession(existingByKey, cashSessionCloseSchema)) {
        throw new IdempotencyKeyReusedError();
      }
      return existingByKey;
    }

    try {
      return await this.uow.run(ctx, async ({ tx, publish }) => {
        const replay = await this.findCloseKey.executeInTx(tx, idempotencyKey);
        if (replay) {
          if (replay.id !== sessionId || !incomingMatchesSession(replay, cashSessionCloseSchema)) {
            throw new IdempotencyKeyReusedError();
          }
          return replay;
        }

        const session = await this.get.executeInTx(tx, sessionId);
        if (!session) throw new CashSessionNotFoundError();
        if (session.status === 'CLOSED') {
          throw new RecordImmutableError('Sessão de caixa já fechada.');
        }

        const counted = countedFromSchema(cashSessionCloseSchema);
        const countedTotal = counted.reduce((acc, row) => acc + row.amountCents, 0n);
        const live = expectedByMethod({
          openingCents: BigInt(session.openingCents),
          openingByMethod: session.openingByMethod.map((row) => ({
            method: row.method,
            amountCents: BigInt(row.amountCents),
          })),
          movements: session.movements.map((movement) => ({
            kind: movement.kind,
            method: movement.method,
            amountCents: BigInt(movement.amountCents),
          })),
        });
        const diff = differenceCents(countedTotal, live.expectedCents);
        const reason = cashSessionCloseSchema.differenceReason?.trim() || null;
        if (diff !== 0n && (!reason || reason.length < 10)) {
          throw new DifferenceReasonRequiredError();
        }

        const closedAt = new Date();
        await this.close.executeInTx(tx, {
          sessionId,
          closedBy: ctx.userId,
          closedAt,
          countedCents: countedTotal,
          expectedCents: live.expectedCents,
          differenceCents: diff,
          countedByMethod: cashSessionCloseSchema.countedByMethod,
          expectedByMethod: live.expectedByMethod.map((row) => ({
            method: row.method,
            expectedCents: Number(row.amountCents),
          })),
          differenceReason: reason,
          closeIdempotencyKey: idempotencyKey,
        });

        publish([
          {
            name: 'billing.cash_session_closed',
            payload: { cashSessionId: sessionId, requestId: ctx.requestId },
          },
        ]);

        const closed = await this.get.executeInTx(tx, sessionId);
        if (!closed) throw new CashSessionNotFoundError();
        return closed;
      });
    } catch (err) {
      if (!isUniqueConflict(err)) throw err;
      const replay = await this.findCloseKey.execute(ctx, idempotencyKey);
      if (!replay || replay.id !== sessionId || !incomingMatchesSession(replay, cashSessionCloseSchema)) {
        throw new IdempotencyKeyReusedError();
      }
      return replay;
    }
  }
}
