import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import {
  CashSessionRequiredError,
  IdempotencyKeyReusedError,
  InstallmentNotFoundError,
  InstallmentNotPayableError,
  InsufficientPatientCreditError,
  SplitsSumMismatchError,
} from '../../models/errors/billing.errors.js';
import {
  applyPaymentAmounts,
  installmentStatusAfterPaid,
  receivableStatusFromInstallments,
} from '../../models/installment_payment.model.js';
import {
  hasCashSplit,
  patientCreditCents,
  paymentPayloadMatches,
  sumSplitCents,
} from '../../models/payment_idempotency.model.js';
import { GetOpenRepository } from '../../repositories/cash_session/cash_session_get_open.repository.js';
import { BalanceRepository } from '../../repositories/credit_ledger/credit_ledger_balance.repository.js';
import { HasOverdueRepository } from '../../repositories/installment/installment_overdue.repository.js';
import { tenantToday } from '../../helpers/tenant_today.helper.js';
import { setPatientHasOverdue } from '../../../patients/patients_public.js';
import {
  FindByIdempotencyRepository,
  GetForPaymentRepository,
  ListStatusesRepository,
} from '../../repositories/payment/payment_get.repository.js';
import { RegisterRepository } from '../../repositories/payment/payment_register.repository.js';
import { NextNumberRepository } from '../../repositories/receipt/receipt_next_number.repository.js';
import type { PaymentCreateSchema } from '../../schemas/billing.schema.js';
import type { PaymentRegisterResult } from '../../types/receivable/receivable_http.types.js';
import { toJsonCents } from '../../helpers/money.helper.js';
import type { PaymentMethod } from '../../enum/payment/payment_method.enum.js';

function isIdempotencyConflict(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = String((err as { code?: string }).code ?? '');
  const message = String((err as { message?: string }).message ?? '');
  return code === 'P2002' || code === '23505' || message.includes('uq_payment_idempotency');
}

function toRegisterResult(
  paymentId: string,
  receiptNumber: bigint,
  installmentStatus: PaymentRegisterResult['installmentStatus'],
  creditCentsGranted: bigint,
  cashSessionId: string | null,
): PaymentRegisterResult {
  return {
    paymentId,
    receiptNumber: Number(receiptNumber),
    installmentStatus,
    creditCentsGranted: toJsonCents(creditCentsGranted),
    cashSessionId,
  };
}

export class RegisterAction {
  constructor(
    private readonly getInstallment = new GetForPaymentRepository(),
    private readonly findIdempotency = new FindByIdempotencyRepository(),
    private readonly getOpenSession = new GetOpenRepository(),
    private readonly creditBalance = new BalanceRepository(),
    private readonly nextReceipt = new NextNumberRepository(),
    private readonly listStatuses = new ListStatusesRepository(),
    private readonly register = new RegisterRepository(),
    private readonly hasOverdue = new HasOverdueRepository(),
    private readonly uow = new UnitOfWork(),
  ) {}

  async execute(
    ctx: RequestContext,
    installmentId: string,
    paymentSchema: PaymentCreateSchema,
    idempotencyKey: string,
  ): Promise<PaymentRegisterResult> {
    const splits = paymentSchema.splits.map((split) => ({
      method: split.method,
      amountCents: BigInt(split.amountCents),
      cardBrand: split.cardBrand ?? null,
      installmentsQty: split.installmentsQty ?? null,
    }));
    const amountCents = BigInt(paymentSchema.amountCents);
    if (sumSplitCents(splits) !== amountCents) throw new SplitsSumMismatchError();

    const incoming = {
      installmentId,
      amountCents,
      notes: paymentSchema.notes ?? null,
      splits,
    };

    const existing = await this.findIdempotency.execute(ctx, idempotencyKey);
    if (existing) {
      if (
        !paymentPayloadMatches(incoming, {
          installmentId: existing.installmentId,
          amountCents: existing.amountCents,
          notes: existing.notes,
          splits: existing.splits,
        })
      ) {
        throw new IdempotencyKeyReusedError();
      }
      return toRegisterResult(
        existing.id,
        existing.receiptNumber,
        existing.installmentStatus,
        existing.creditGrantedCents,
        existing.cashSessionId,
      );
    }

    try {
      return await this.uow.run(ctx, async ({ tx, publish }) => {
        const replay = await this.findIdempotency.executeInTx(tx, idempotencyKey);
        if (replay) {
          if (
            !paymentPayloadMatches(incoming, {
              installmentId: replay.installmentId,
              amountCents: replay.amountCents,
              notes: replay.notes,
              splits: replay.splits,
            })
          ) {
            throw new IdempotencyKeyReusedError();
          }
          return toRegisterResult(
            replay.id,
            replay.receiptNumber,
            replay.installmentStatus,
            replay.creditGrantedCents,
            replay.cashSessionId,
          );
        }

        const installment = await this.getInstallment.executeInTx(tx, installmentId);
        if (!installment) throw new InstallmentNotFoundError();
        if (
          installment.status === 'PAID' ||
          installment.status === 'CANCELLED' ||
          installment.receivableStatus === 'CANCELLED'
        ) {
          throw new InstallmentNotPayableError();
        }

        const session = await this.getOpenSession.executeInTx(tx, {
          unitId: installment.unitId,
          openedBy: ctx.userId,
        });
        if (hasCashSplit(splits) && !session) throw new CashSessionRequiredError();

        const creditNeeded = patientCreditCents(splits);
        if (creditNeeded > 0n) {
          const available = await this.creditBalance.executeInTx(tx, installment.patientId);
          if (creditNeeded > available) throw new InsufficientPatientCreditError();
        }

        const applied = applyPaymentAmounts(
          installment.amountCents,
          installment.paidCents,
          amountCents,
        );
        const nextInstallmentStatus = installmentStatusAfterPaid(
          installment.amountCents,
          applied.nextPaidCents,
        );
        const lines = await this.listStatuses.executeInTx(tx, installment.receivableId);
        const nextReceivableStatus = receivableStatusFromInstallments(
          lines.map((line) => (line.id === installment.id ? nextInstallmentStatus : line.status)),
        );

        const receiptNumber = await this.nextReceipt.executeInTx(tx, ctx);
        const receivedAt = paymentSchema.receivedAt ? new Date(paymentSchema.receivedAt) : new Date();
        const cashSessionId = session?.id ?? null;
        const cashMovements = cashSessionId
          ? splits
              .filter((split) => split.method !== 'PATIENT_CREDIT')
              .map((split) => ({
                kind: 'PAYMENT_IN' as const,
                amountCents: split.amountCents,
                method: split.method as PaymentMethod,
              }))
          : [];

        const paymentId = await this.register.executeInTx(tx, ctx, {
          installmentId: installment.id,
          receivableId: installment.receivableId,
          unitId: installment.unitId,
          patientId: installment.patientId,
          amountCents,
          receivedAt,
          receivedBy: ctx.userId,
          notes: paymentSchema.notes ?? null,
          idempotencyKey,
          receiptNumber,
          cashSessionId,
          splits,
          nextPaidCents: applied.nextPaidCents,
          nextInstallmentStatus,
          installmentPaidAt: nextInstallmentStatus === 'PAID' ? receivedAt : installment.paidAt,
          nextReceivableStatus,
          creditGrantedCents: applied.creditGrantedCents,
          creditConsumedCents: creditNeeded,
          cashMovements,
        });

        const today = await tenantToday(ctx);
        const overdue = await this.hasOverdue.executeInTx(tx, installment.patientId, today);
        await setPatientHasOverdue(ctx, installment.patientId, overdue, tx);

        publish([
          {
            name: 'billing.payment_registered',
            payload: {
              paymentId,
              installmentId: installment.id,
              patientId: installment.patientId,
              requestId: ctx.requestId,
            },
          },
        ]);

        return toRegisterResult(
          paymentId,
          receiptNumber,
          nextInstallmentStatus,
          applied.creditGrantedCents,
          cashSessionId,
        );
      });
    } catch (err) {
      if (!isIdempotencyConflict(err)) throw err;
      const replay = await this.findIdempotency.execute(ctx, idempotencyKey);
      if (
        !replay ||
        !paymentPayloadMatches(incoming, {
          installmentId: replay.installmentId,
          amountCents: replay.amountCents,
          notes: replay.notes,
          splits: replay.splits,
        })
      ) {
        throw new IdempotencyKeyReusedError();
      }
      return toRegisterResult(
        replay.id,
        replay.receiptNumber,
        replay.installmentStatus,
        replay.creditGrantedCents,
        replay.cashSessionId,
      );
    }
  }
}
