import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import { getPublicClinicCatalog } from '../../../clinic/clinic_public.js';
import { AvailabilityService } from '../availability/availability_get.service.js';
import type { PublicAvailabilityQuerySchema } from '../../schemas/public_booking.schema.js';
import type { AvailabilityResult } from '../../types/scheduling.types.js';
import { addDaysYmd, isWithinLeadWindow } from '../../helpers/public_booking.helper.js';
import { formatYmdInTz } from '../../helpers/scheduling.helper.js';

export class GetService {
  constructor(private readonly availability = new AvailabilityService()) {}

  async execute(
    ctx: RequestContext,
    query: PublicAvailabilityQuerySchema,
  ): Promise<{ timezone: string; days: AvailabilityResult[] }> {
    const catalog = await getPublicClinicCatalog(ctx);
    if (!catalog) throw new AppError('NOT_FOUND', 'Clínica não encontrada.', 404);

    const publicProcedure = catalog.procedures.find((p) => p.id === query.procedureId);
    if (!publicProcedure) {
      throw new AppError(
        'BUSINESS_RULE_VIOLATION',
        'Procedimento não disponível no agendamento público.',
        422,
      );
    }

    const professional = catalog.professionals.find((p) => p.id === query.professionalId);
    if (!professional) {
      throw new AppError('BUSINESS_RULE_VIOLATION', 'Profissional indisponível.', 422);
    }

    const today = formatYmdInTz(new Date(), catalog.timezone);
    const from = query.from ?? today;
    const maxTo = addDaysYmd(today, catalog.bookingSettings.maxLeadDays);
    const requestedTo = query.to ?? from;
    const to = requestedTo > maxTo ? maxTo : requestedTo;
    if (to < from) {
      return { timezone: catalog.timezone, days: [] };
    }

    const days: AvailabilityResult[] = [];
    for (let ymd = from; ymd <= to; ymd = addDaysYmd(ymd, 1)) {
      const day = await this.availability.execute(ctx, {
        professionalId: query.professionalId,
        date: ymd,
        procedureId: query.procedureId,
      });
      days.push({
        ...day,
        slots: day.slots.map((slot) => {
          const startsAt = new Date(slot.startsAt);
          if (slot.available && !isWithinLeadWindow(startsAt, catalog.bookingSettings)) {
            return { ...slot, available: false, reason: 'OUT_OF_HOURS' as const };
          }
          return slot;
        }),
      });
    }

    return { timezone: catalog.timezone, days };
  }
}
