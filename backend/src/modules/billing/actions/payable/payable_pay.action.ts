import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import {
  CashSessionRequiredError,
  IdempotencyKeyReusedError,
  PayableAlreadyPaidError,
  PayableMethodNotAllowedError,
  PayableNotFoundError,
} from '../../models/errors/billing.errors.js';
import { dateOnly } from '../../helpers/money.helper.js';
import { nextRecurrenceDueDate, parsePayableRecurrence } from '../../models/overdue.model.js';
import { GetOpenRepository } from '../../repositories/cash_session/cash_session_get_open.repository.js';
import {
  FindByPayIdempotencyRepository,
  GetRawRepository,
} from '../../repositories/payable/payable_get.repository.js';
import { PayRepository } from '../../repositories/payable/payable_pay.repository.js';
import type { PayablePaySchema } from '../../schemas/billing.schema.js';
import type { PayablePayResult } from '../../types/payable/payable.types.js';
import { tenantToday } from '../../helpers/tenant_today.helper.js';
import type { PaymentMethod } from '../../enum/payment/payment_method.enum.js';

function isUniqueConflict(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = String((err as { code?: string }).code ?? '');
  return code === 'P2002' || code === '23505';
}

export class PayAction {
  constructor(
    private readonly getRaw = new GetRawRepository(),
    private readonly findKey = new FindByPayIdempotencyRepository(),
    private readonly getOpenSession = new GetOpenRepository(),
    private readonly pay = new PayRepository(),
    private readonly uow = new UnitOfWork(),
  ) {}

  async execute(
    ctx: RequestContext,
    payableId: string,
    payablePaySchema: PayablePaySchema,
    idempotencyKey: string,
  ): Promise<PayablePayResult> {
    const today = await tenantToday(ctx);
    const method = payablePaySchema.method as PaymentMethod;
    if (method === 'PATIENT_CREDIT') throw new PayableMethodNotAllowedError();

    const existing = await this.findKey.execute(ctx, idempotencyKey, today);
    if (existing && existing.id !== payableId) throw new IdempotencyKeyReusedError();
    if (existing) {
      if (existing.method !== method) throw new IdempotencyKeyReusedError();
      return {
        payableId: existing.id,
        status: existing.status,
        cashSessionId: null,
        spawnedPayableId: null,
      };
    }

    try {
      return await this.uow.run(ctx, async ({ tx, publish }) => {
        const replay = await this.findKey.executeInTx(tx, idempotencyKey, today);
        if (replay) {
          if (replay.id !== payableId) throw new IdempotencyKeyReusedError();
          return {
            payableId: replay.id,
            status: replay.status,
            cashSessionId: null,
            spawnedPayableId: null,
          };
        }

        const row = await this.getRaw.executeInTx(tx, payableId);
        if (!row) throw new PayableNotFoundError();
        if (row.status === 'PAID') throw new PayableAlreadyPaidError();
        if (row.status === 'CANCELLED') throw new PayableAlreadyPaidError();

        const session = await this.getOpenSession.executeInTx(tx, {
          unitId: row.unitId,
          openedBy: ctx.userId,
        });
        if (method === 'CASH' && !session) throw new CashSessionRequiredError();
        const cashSessionId = session?.id ?? null;

        const recurrence = parsePayableRecurrence(row.recurrence);
        const nextDue = nextRecurrenceDueDate(dateOnly(row.dueDate), recurrence);

        const spawnedPayableId = await this.pay.executeInTx(tx, ctx, {
          payableId: row.id,
          amountCents: row.amountCents,
          description: row.description,
          method,
          paidAt: payablePaySchema.paidAt ? new Date(payablePaySchema.paidAt) : new Date(),
          payIdempotencyKey: idempotencyKey,
          cashSessionId,
          spawn: nextDue
            ? {
                unitId: row.unitId,
                categoryId: row.categoryId,
                description: row.description,
                amountCents: row.amountCents,
                dueDate: nextDue,
                supplier: row.supplier,
                recurrence,
              }
            : null,
        });

        publish([
          {
            name: 'billing.payable_paid',
            payload: { payableId: row.id, spawnedPayableId, requestId: ctx.requestId },
          },
        ]);

        return {
          payableId: row.id,
          status: 'PAID',
          cashSessionId,
          spawnedPayableId,
        };
      });
    } catch (err) {
      if (!isUniqueConflict(err)) throw err;
      const replay = await this.findKey.execute(ctx, idempotencyKey, today);
      if (!replay || replay.id !== payableId) throw new IdempotencyKeyReusedError();
      return {
        payableId: replay.id,
        status: replay.status,
        cashSessionId: null,
        spawnedPayableId: null,
      };
    }
  }
}
