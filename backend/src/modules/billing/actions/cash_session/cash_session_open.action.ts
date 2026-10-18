import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import {
  CashSessionAlreadyOpenError,
  CashSessionNotFoundError,
  IdempotencyKeyReusedError,
  OpeningByMethodMismatchError,
  UnitNotFoundError,
} from '../../models/errors/billing.errors.js';
import { methodAmountsMatch, sumMethodCents, type MethodCents } from '../../models/cash_session.model.js';
import { CreateRepository } from '../../repositories/cash_session/cash_session_create.repository.js';
import {
  FindByIdempotencyRepository,
  GetRepository,
  GetUnitRepository,
} from '../../repositories/cash_session/cash_session_get.repository.js';
import type { CashSessionCreateSchema } from '../../schemas/billing.schema.js';
import type { CashSessionDto } from '../../types/cash_session/cash_session.types.js';

function isUniqueConflict(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = String((err as { code?: string }).code ?? '');
  const message = String((err as { message?: string }).message ?? '');
  return code === 'P2002' || code === '23505' || message.includes('Unique constraint');
}

function resolveOpening(cashSessionSchema: CashSessionCreateSchema): MethodCents[] {
  const openingCents = BigInt(cashSessionSchema.openingCents);
  if (cashSessionSchema.openingByMethod && cashSessionSchema.openingByMethod.length > 0) {
    const rows = cashSessionSchema.openingByMethod.map((row) => ({
      method: row.method,
      amountCents: BigInt(row.amountCents),
    }));
    if (sumMethodCents(rows) !== openingCents) throw new OpeningByMethodMismatchError();
    return rows;
  }
  return openingCents > 0n ? [{ method: 'CASH', amountCents: openingCents }] : [];
}

function openingMatches(session: CashSessionDto, unitId: string, opening: MethodCents[]): boolean {
  if (session.unitId !== unitId) return false;
  const stored: MethodCents[] = session.openingByMethod.map((row) => ({
    method: row.method,
    amountCents: BigInt(row.amountCents),
  }));
  return methodAmountsMatch(stored, opening) && BigInt(session.openingCents) === sumMethodCents(opening);
}

export class OpenAction {
  constructor(
    private readonly findIdempotency = new FindByIdempotencyRepository(),
    private readonly getUnit = new GetUnitRepository(),
    private readonly create = new CreateRepository(),
    private readonly get = new GetRepository(),
    private readonly uow = new UnitOfWork(),
  ) {}

  async execute(
    ctx: RequestContext,
    cashSessionSchema: CashSessionCreateSchema,
    idempotencyKey: string,
  ): Promise<CashSessionDto> {
    const opening = resolveOpening(cashSessionSchema);

    const existing = await this.findIdempotency.execute(ctx, idempotencyKey);
    if (existing) {
      if (!openingMatches(existing, cashSessionSchema.unitId, opening)) {
        throw new IdempotencyKeyReusedError();
      }
      return existing;
    }

    try {
      return await this.uow.run(ctx, async ({ tx, publish }) => {
        const replay = await this.findIdempotency.executeInTx(tx, idempotencyKey);
        if (replay) {
          if (!openingMatches(replay, cashSessionSchema.unitId, opening)) {
            throw new IdempotencyKeyReusedError();
          }
          return replay;
        }

        const unit = await this.getUnit.executeInTx(tx, cashSessionSchema.unitId);
        if (!unit) throw new UnitNotFoundError();

        const sessionId = await this.create.executeInTx(tx, ctx, {
          unitId: cashSessionSchema.unitId,
          openingCents: BigInt(cashSessionSchema.openingCents),
          openingByMethod: opening.map((row) => ({
            method: row.method,
            amountCents: Number(row.amountCents),
          })),
          idempotencyKey,
        });

        publish([
          {
            name: 'billing.cash_session_opened',
            payload: { cashSessionId: sessionId, unitId: cashSessionSchema.unitId, requestId: ctx.requestId },
          },
        ]);

        const created = await this.get.executeInTx(tx, sessionId);
        if (!created) throw new CashSessionNotFoundError();
        return created;
      });
    } catch (err) {
      if (!isUniqueConflict(err)) throw err;
      const replay = await this.findIdempotency.execute(ctx, idempotencyKey);
      if (replay) {
        if (!openingMatches(replay, cashSessionSchema.unitId, opening)) {
          throw new IdempotencyKeyReusedError();
        }
        return replay;
      }
      throw new CashSessionAlreadyOpenError();
    }
  }
}
