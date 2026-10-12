import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { listPatientTimelineAppointments } from '../../../scheduling/scheduling_public.js';
import { listQuotesForTimeline } from '../../../treatments/treatments_public.js';
import { GetService as PatientGetService } from '../patient/patient_get.service.js';
import { PatientNotFoundError } from '../../models/errors/patients.errors.js';
import type {
  PatientTimelineResult,
  TimelineItem,
  TimelineSource,
} from '../../types/patients.types.js';

function hasPermission(ctx: RequestContext, permission: string): boolean {
  return (ctx.permissions ?? []).includes(permission);
}

export class GetService {
  constructor(private readonly getPatient = new PatientGetService()) {}

  async execute(ctx: RequestContext, patientId: string): Promise<PatientTimelineResult> {
    const patient = await this.getPatient.execute(ctx, patientId);
    if (!patient) throw new PatientNotFoundError();

    const includedSources: TimelineSource[] = [];
    const items: TimelineItem[] = [];

    if (hasPermission(ctx, 'agenda.read')) {
      includedSources.push('APPOINTMENT');
      const appointments = await listPatientTimelineAppointments(ctx, patientId);
      for (const a of appointments) {
        items.push({
          id: `appointment:${a.id}`,
          source: 'APPOINTMENT',
          occurredAt: a.startsAt,
          title: a.procedureName ?? 'Agendamento',
          summary: a.professionalName
            ? `${a.status} · ${a.professionalName}`
            : a.status,
          refId: a.id,
          meta: {
            status: a.status,
            origin: a.origin,
            endsAt: a.endsAt,
          },
        });
      }
    }

    // Fontes tipadas vazias quando há permissão (S2: módulos ainda inexistentes).
    // Recepção sem clinical_records.read → CLINICAL omitido (RF-E3-10).
    if (hasPermission(ctx, 'clinical_records.read')) {
      includedSources.push('CLINICAL');
    }
    if (hasPermission(ctx, 'quotes.read')) {
      includedSources.push('QUOTE');
      const quotes = await listQuotesForTimeline(ctx, patientId);
      for (const quote of quotes) {
        items.push({
          id: `quote:${quote.id}`,
          source: 'QUOTE',
          occurredAt: quote.decidedAt ?? quote.createdAt,
          title: `Orçamento nº ${quote.number}`,
          summary: quote.status,
          refId: quote.id,
          meta: {
            status: quote.status,
            totalCents: quote.totalCents,
            decidedAt: quote.decidedAt,
          },
        });
      }
    }
    if (hasPermission(ctx, 'finance.read')) {
      includedSources.push('PAYMENT');
    }
    if (hasPermission(ctx, 'messaging.read')) {
      includedSources.push('MESSAGE');
    }

    items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

    return {
      items,
      includedSources,
      nextCursor: null,
    };
  }
}
