import { randomBytes } from 'node:crypto';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { env } from '../../../../shared/config/env.js';
import { hashToken } from '../../../../shared/helpers/token_hash.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import { getPublicClinicCatalog } from '../../../clinic/clinic_public.js';
import {
  findOrCreateFromPublicBooking,
  grantPublicBookingConsents,
} from '../../../patients/patients_public.js';
import {
  GetTokenByHashRepository,
  UpdateTokenRepository,
  CreateTokenRepository,
} from '../../repositories/public_booking_token/public_booking_token.repository.js';
import type { PublicBookingVerifySchema } from '../../schemas/public_booking.schema.js';
import type { PublicBookingVerifyResult } from '../../types/public_booking.types.js';
import { OTP_MAX_ATTEMPTS, assertLeadTime } from '../../helpers/public_booking.helper.js';
import { CreateService as AppointmentCreateService } from '../../services/appointment/appointment_create.service.js';

export class VerifyAction {
  constructor(
    private readonly getToken = new GetTokenByHashRepository(),
    private readonly updateToken = new UpdateTokenRepository(),
    private readonly createToken = new CreateTokenRepository(),
    private readonly createAppointment = new AppointmentCreateService(),
  ) {}

  async execute(
    ctx: RequestContext,
    verifySchema: PublicBookingVerifySchema,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<PublicBookingVerifyResult> {
    const token = await this.getToken.execute(ctx, hashToken(verifySchema.bookingId));
    if (!token || token.purpose !== 'BOOKING') {
      throw new AppError('NOT_FOUND', 'Pedido de agendamento não encontrado.', 404);
    }
    if (token.usedAt) {
      throw new AppError('BUSINESS_RULE_VIOLATION', 'Este código já foi utilizado.', 409);
    }
    if (token.expiresAt.getTime() < Date.now()) {
      throw new AppError('BUSINESS_RULE_VIOLATION', 'Código expirado. Solicite um novo agendamento.', 422);
    }

    const attempts = token.meta.attempts ?? 0;
    if (attempts >= OTP_MAX_ATTEMPTS) {
      throw new AppError('BUSINESS_RULE_VIOLATION', 'Código invalidado após 3 tentativas.', 409);
    }

    if (hashToken(verifySchema.code) !== token.meta.otpHash) {
      const nextAttempts = attempts + 1;
      await this.updateToken.execute(ctx, token.id, {
        meta: { ...token.meta, attempts: nextAttempts },
        ...(nextAttempts >= OTP_MAX_ATTEMPTS ? { usedAt: new Date() } : {}),
      });
      if (nextAttempts >= OTP_MAX_ATTEMPTS) {
        throw new AppError('BUSINESS_RULE_VIOLATION', 'Código invalidado após 3 tentativas.', 409);
      }
      throw new AppError('BUSINESS_RULE_VIOLATION', 'Código inválido.', 422);
    }

    const catalog = await getPublicClinicCatalog(ctx);
    if (!catalog) throw new AppError('NOT_FOUND', 'Clínica não encontrada.', 404);

    const name = token.meta.name ?? '';
    const phone = token.meta.phone ?? '';
    const procedureId = token.meta.procedureId;
    const professionalId = token.meta.professionalId;
    const startsAt = token.meta.startsAt;
    if (!procedureId || !professionalId || !startsAt || !name || !phone) {
      throw new AppError('VALIDATION_ERROR', 'Pedido de agendamento incompleto.', 400);
    }
    if (!catalog.procedures.some((p) => p.id === procedureId)) {
      throw new AppError(
        'BUSINESS_RULE_VIOLATION',
        'Procedimento não disponível no agendamento público.',
        422,
      );
    }
    assertLeadTime(new Date(startsAt), catalog.bookingSettings);

    const { patient, needsDataReview } = await findOrCreateFromPublicBooking(ctx, {
      name,
      phone,
      email: token.meta.email,
    });

    await grantPublicBookingConsents(ctx, patient.id, {
      consentDataProcessing: token.meta.consentDataProcessing ?? true,
      consentTerms: token.meta.consentTerms ?? true,
      consentWhatsappMarketing: token.meta.consentWhatsappMarketing ?? false,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    const appointment = await this.createAppointment.execute(
      ctx,
      {
        patientId: patient.id,
        professionalId,
        procedureId,
        startsAt,
        chairId: null,
      },
      null,
      {
        origin: 'PUBLIC_BOOKING',
        status: catalog.bookingSettings.publicStatus,
        actorType: 'PATIENT',
      },
    );

    await this.updateToken.execute(ctx, token.id, {
      usedAt: new Date(),
      targetId: appointment.id,
      meta: { ...token.meta, attempts },
    });

    const rawConfirm = randomBytes(24).toString('base64url');
    await this.createToken.execute(ctx, {
      purpose: 'CONFIRMATION',
      tokenHash: hashToken(rawConfirm),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
      targetId: appointment.id,
    });

    return {
      appointment,
      patient: {
        id: patient.id,
        name: patient.name,
        phonePrimary: patient.phonePrimary,
        origin: patient.origin,
        needsDataReview,
      },
      confirmationToken: env.NODE_ENV === 'test' ? rawConfirm : undefined,
    };
  }
}
