import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import { createReceivableFromApprovedQuote } from '../../../billing/billing_public.js';
import { getPublicClinicCatalog } from '../../../clinic/clinic_public.js';
import { issueQuoteContract } from '../../../documents/documents_public.js';
import { buildQuoteContractData } from '../../helpers/quote_contract_data.helper.js';
import { digitsOnly, getPatientById, isMinor } from '../../../patients/patients_public.js';
import { markPublicTokenUsed } from '../../../scheduling/scheduling_public.js';
import {
  GuardianCpfMismatchError,
  GuardianRequiredError,
  IdempotencyKeyRequiredError,
  IdempotencyKeyReusedError,
  InvalidQuoteMoneyError,
  PatientRequiredError,
  QuoteExpiredError,
  QuoteNotDecidableError,
  QuoteNotFoundError,
  QuoteRejectReasonRequiredError,
} from '../../models/errors/treatments.errors.js';
import {
  decisionMatchesQuote,
  resolveApproval,
} from '../../models/quote_decision.model.js';
import { isCivilDatePast } from '../../helpers/quote_valid_until.helper.js';
import { DecideRepository } from '../../repositories/quote/quote_decide.repository.js';
import { FindByIdempotencyRepository } from '../../repositories/quote/quote_find_idempotency.repository.js';
import { GetRepository } from '../../repositories/quote/quote_get.repository.js';
import { CreateRepository as CreatePlanRepository } from '../../repositories/treatment_plan/treatment_plan_create.repository.js';
import { GetByQuoteRepository } from '../../repositories/treatment_plan/treatment_plan_get_by_quote.repository.js';
import type { QuoteDto } from '../../types/quote/quote_crud.types.js';
import type {
  QuoteDecideOptions,
  QuoteDecisionInput,
  QuoteDecisionResult,
} from '../../types/quote/quote_decision.types.js';

function isIdempotencyConflict(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = String((err as { code?: string }).code ?? '');
  const message = String((err as { message?: string }).message ?? '');
  return code === 'P2002' || code === '23505' || message.includes('uq_quote_idempotency');
}

function toDecisionResult(
  quote: QuoteDto,
  plan: { id: string; itemCount: number } | null,
): QuoteDecisionResult {
  return {
    quoteId: quote.id,
    status: quote.status,
    treatmentPlanId: plan?.id ?? null,
    treatmentItems: plan?.itemCount ?? 0,
    receivable: quote.receivable,
  };
}

export class DecideAction {
  constructor(
    private readonly get = new GetRepository(),
    private readonly findIdempotency = new FindByIdempotencyRepository(),
    private readonly decide = new DecideRepository(),
    private readonly createPlan = new CreatePlanRepository(),
    private readonly getPlanByQuote = new GetByQuoteRepository(),
    private readonly uow = new UnitOfWork(),
  ) {}

  /** Contrato automático: falha aqui nunca desfaz a aprovação (o botão manual cobre). */
  private async issueContractIfEnabled(ctx: RequestContext, quoteId: string): Promise<void> {
    try {
      const approved = await this.get.execute(ctx, quoteId);
      const contractData = approved ? buildQuoteContractData(approved) : null;
      if (contractData) await issueQuoteContract(ctx, contractData, 'AUTO');
    } catch (err) {
      console.warn('[quotes] contrato automático não gerado', { quoteId, err });
    }
  }

  async execute(
    ctx: RequestContext,
    quoteId: string,
    quoteDecisionSchema: QuoteDecisionInput,
    idempotencyKey: string,
    decideOptions: QuoteDecideOptions,
  ): Promise<QuoteDecisionResult> {
    const key = idempotencyKey.trim();
    if (!key) throw new IdempotencyKeyRequiredError();

    const existingByKey = await this.findIdempotency.execute(ctx, key);
    if (existingByKey && existingByKey.id !== quoteId) {
      throw new IdempotencyKeyReusedError();
    }

    const quote = await this.get.execute(ctx, quoteId);
    if (!quote) throw new QuoteNotFoundError();

    if (existingByKey) {
      if (!decisionMatchesQuote(existingByKey, quoteDecisionSchema)) {
        throw new IdempotencyKeyReusedError();
      }
      const plan = await this.getPlanByQuote.execute(ctx, existingByKey.id);
      return toDecisionResult(existingByKey, plan);
    }

    if (quote.status !== 'SENT') {
      throw new QuoteNotDecidableError(quote.status);
    }

    const catalog = await getPublicClinicCatalog(ctx);
    const timezone = catalog?.timezone ?? 'America/Sao_Paulo';
    if (quote.validUntil && isCivilDatePast(quote.validUntil, timezone)) {
      throw new QuoteExpiredError();
    }

    const patient = await getPatientById(ctx, quote.patientId);
    if (!patient) throw new PatientRequiredError();

    if (decideOptions.enforceGuardian) {
      const needsGuardian = isMinor(patient.birthDate) || patient.guardians.length > 0;
      if (needsGuardian) {
        if (patient.guardians.length === 0) throw new GuardianRequiredError();
        const provided = digitsOnly(quoteDecisionSchema.guardianCpf ?? '');
        if (!provided) throw new GuardianCpfMismatchError();
        const match = patient.guardians.some((guardian) => digitsOnly(guardian.cpf ?? '') === provided);
        if (!match) throw new GuardianCpfMismatchError();
      }
    }

    try {
      const result = await this.uow.run(ctx, async ({ tx, publish }) => {
        if (quoteDecisionSchema.decision === 'REJECTED') {
          const reason = quoteDecisionSchema.reason?.trim() ?? '';
          if (reason.length < 10) throw new QuoteRejectReasonRequiredError();
          await this.decide.executeInTx(tx, ctx, {
            quoteId: quote.id,
            status: 'REJECTED',
            decidedBy: decideOptions.decidedBy,
            rejectReason: reason,
            idempotencyKey: key,
            approvedIds: [],
          });
          if (decideOptions.publicTokenId) {
            await markPublicTokenUsed(ctx, decideOptions.publicTokenId, tx);
          }
          publish([
            {
              name: 'treatments.quote_rejected',
              payload: { quoteId: quote.id, patientId: quote.patientId, requestId: ctx.requestId },
            },
          ]);
          return {
            quoteId: quote.id,
            status: 'REJECTED' as const,
            treatmentPlanId: null,
            treatmentItems: 0,
            receivable: null,
          };
        }

        if (!quoteDecisionSchema.payment) {
          throw new InvalidQuoteMoneyError('Informe as condições de pagamento.');
        }
        const resolution = resolveApproval(
          quote.items,
          quote.discountCents,
          quoteDecisionSchema.approvedItemIds,
        );
        const approvedItems = quote.items.filter((item) => resolution.approvedIds.includes(item.id));
        await this.decide.executeInTx(tx, ctx, {
          quoteId: quote.id,
          status: resolution.status,
          decidedBy: decideOptions.decidedBy,
          rejectReason: null,
          idempotencyKey: key,
          approvedIds: resolution.approvedIds,
        });
        const plan = await this.createPlan.executeInTx(tx, ctx, {
          patientId: quote.patientId,
          quoteId: quote.id,
          professionalId: quote.professionalId,
          items: approvedItems,
        });
        const downPaymentCents = BigInt(quoteDecisionSchema.payment.downPaymentCents ?? 0);
        const receivable = await createReceivableFromApprovedQuote(
          ctx,
          {
            patientId: quote.patientId,
            unitId: quote.unitId,
            quoteId: quote.id,
            treatmentPlanId: plan.planId,
            totalCents: resolution.approvedTotalCents,
            installmentCount: quoteDecisionSchema.payment.installments,
            firstDueDate: quoteDecisionSchema.payment.firstDueDate,
            downPaymentCents,
            description: quoteDecisionSchema.payment.method,
          },
          tx,
        );
        if (decideOptions.publicTokenId) {
          await markPublicTokenUsed(ctx, decideOptions.publicTokenId, tx);
        }
        publish([
          {
            name: 'treatments.quote_approved',
            payload: {
              quoteId: quote.id,
              patientId: quote.patientId,
              status: resolution.status,
              requestId: ctx.requestId,
            },
          },
          {
            name: 'treatments.plan_created',
            payload: {
              treatmentPlanId: plan.planId,
              quoteId: quote.id,
              patientId: quote.patientId,
              requestId: ctx.requestId,
            },
          },
        ]);
        return {
          quoteId: quote.id,
          status: resolution.status,
          treatmentPlanId: plan.planId,
          treatmentItems: plan.itemCount,
          receivable: {
            id: receivable.id,
            totalCents: Number(receivable.totalCents),
            downPaymentCents: Number(receivable.downPaymentCents),
            installments: receivable.installments.map((line) => ({
              number: line.number,
              dueDate: line.dueDate,
              amountCents: Number(line.amountCents),
            })),
          },
        };
      });
      if (result.status !== 'REJECTED') await this.issueContractIfEnabled(ctx, quote.id);
      return result;
    } catch (err) {
      if (!isIdempotencyConflict(err)) throw err;
      const replay = await this.findIdempotency.execute(ctx, key);
      if (!replay || replay.id !== quoteId || !decisionMatchesQuote(replay, quoteDecisionSchema)) {
        throw new IdempotencyKeyReusedError();
      }
      const plan = await this.getPlanByQuote.execute(ctx, replay.id);
      return toDecisionResult(replay, plan);
    }
  }
}
