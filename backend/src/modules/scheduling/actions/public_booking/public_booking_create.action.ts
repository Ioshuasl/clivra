import { randomBytes } from 'node:crypto';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { env } from '../../../../shared/config/env.js';
import { hashToken } from '../../../../shared/helpers/token_hash.js';
import { getEmailProvider } from '../../../../shared/integrations/email/index.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import { getPublicClinicCatalog } from '../../../clinic/clinic_public.js';
import { toE164Br } from '../../../patients/patients_public.js';
import { SlotUnavailableError } from '../../models/errors/scheduling.errors.js';
import { CreateTokenRepository } from '../../repositories/public_booking_token/public_booking_token.repository.js';
import type { PublicBookingCreateSchema } from '../../schemas/public_booking.schema.js';
import type { PublicBookingCreateResult } from '../../types/public_booking.types.js';
import {
  OTP_TTL_SECONDS,
  assertLeadTime,
  generateOtp,
} from '../../helpers/public_booking.helper.js';
import { formatYmdInTz } from '../../helpers/scheduling.helper.js';
import { AvailabilityService } from '../../services/availability/availability_get.service.js';

export class CreateAction {
  constructor(
    private readonly createToken = new CreateTokenRepository(),
    private readonly availability = new AvailabilityService(),
    private readonly email = getEmailProvider(),
  ) {}

  async execute(
    ctx: RequestContext,
    bookingSchema: PublicBookingCreateSchema,
  ): Promise<PublicBookingCreateResult> {
    if (!bookingSchema.consentDataProcessing || !bookingSchema.consentTerms) {
      throw new AppError(
        'BUSINESS_RULE_VIOLATION',
        'É necessário aceitar o tratamento de dados e os termos.',
        422,
      );
    }

    const catalog = await getPublicClinicCatalog(ctx);
    if (!catalog) throw new AppError('NOT_FOUND', 'Clínica não encontrada.', 404);

    if (!catalog.procedures.some((p) => p.id === bookingSchema.procedureId)) {
      throw new AppError(
        'BUSINESS_RULE_VIOLATION',
        'Procedimento não disponível no agendamento público.',
        422,
      );
    }
    if (!catalog.professionals.some((p) => p.id === bookingSchema.professionalId)) {
      throw new AppError('BUSINESS_RULE_VIOLATION', 'Profissional indisponível.', 422);
    }

    const email = bookingSchema.email?.trim() || null;
    if (!email) {
      throw new AppError(
        'BUSINESS_RULE_VIOLATION',
        'Informe um e-mail para receber o código de verificação.',
        422,
      );
    }

    const startsAt = new Date(bookingSchema.startsAt);
    assertLeadTime(startsAt, catalog.bookingSettings);

    const phone = toE164Br(bookingSchema.phone);
    if (phone.length < 12) {
      throw new AppError('VALIDATION_ERROR', 'Telefone inválido.', 400);
    }

    const dateYmd = formatYmdInTz(startsAt, catalog.timezone);
    const avail = await this.availability.execute(ctx, {
      professionalId: bookingSchema.professionalId,
      date: dateYmd,
      procedureId: bookingSchema.procedureId,
    });
    const slotOk = avail.slots.some(
      (s) => s.available && Math.abs(new Date(s.startsAt).getTime() - startsAt.getTime()) < 1000,
    );
    if (!slotOk) {
      const suggested = avail.slots.filter((s) => s.available).slice(0, 3).map((s) => s.startsAt);
      throw new SlotUnavailableError({ suggestedSlots: suggested });
    }

    const otp = generateOtp();
    const rawBookingId = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    await this.createToken.execute(ctx, {
      purpose: 'BOOKING',
      tokenHash: hashToken(rawBookingId),
      expiresAt,
      meta: {
        otpHash: hashToken(otp),
        attempts: 0,
        name: bookingSchema.name.trim().replace(/\s+/g, ' '),
        phone,
        email,
        procedureId: bookingSchema.procedureId,
        professionalId: bookingSchema.professionalId,
        startsAt: startsAt.toISOString(),
        consentDataProcessing: bookingSchema.consentDataProcessing,
        consentTerms: bookingSchema.consentTerms,
        consentWhatsappMarketing: bookingSchema.consentWhatsappMarketing,
      },
    });

    await this.email.send({
      to: email,
      subject: `Código de agendamento — ${catalog.name}`,
      text: `Seu código é ${otp}. Ele expira em 5 minutos.`,
    });

    return {
      bookingId: rawBookingId,
      otpSentVia: 'EMAIL',
      expiresInSeconds: OTP_TTL_SECONDS,
      ...(env.NODE_ENV === 'test' ? { debugOtp: otp } : {}),
    };
  }
}
