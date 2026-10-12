import type { RequestContext } from '../../../shared/domain/request_context.js';
import { getProfessionalByMembershipId } from '../../clinic/clinic_public.js';
import {
  FinancialReportForbiddenError,
  ReportScopeForbiddenError,
} from '../models/errors/reporting.errors.js';

export function hasReportsFinancial(ctx: RequestContext): boolean {
  return Boolean(ctx.permissions?.includes('reports.financial'));
}

export function assertReportsFinancial(ctx: RequestContext): void {
  if (!hasReportsFinancial(ctx)) throw new FinancialReportForbiddenError();
}

/** Dentista sem reports.financial não vê consolidado financeiro da clínica. */
export function includeClinicFinancialKpis(ctx: RequestContext): boolean {
  if (hasReportsFinancial(ctx)) return true;
  return ctx.role !== 'DENTIST';
}

export async function resolveScopedProfessionalId(
  ctx: RequestContext,
  requestedProfessionalId?: string,
): Promise<string | undefined> {
  if (ctx.role !== 'DENTIST') return requestedProfessionalId;

  if (!ctx.membershipId) throw new ReportScopeForbiddenError();
  const mine = await getProfessionalByMembershipId(ctx, ctx.membershipId);
  if (!mine) throw new ReportScopeForbiddenError();

  if (requestedProfessionalId && requestedProfessionalId !== mine.id) {
    throw new ReportScopeForbiddenError();
  }
  return mine.id;
}
