import type { AppointmentSummary } from './scheduling.types.js';

export type PublicClinicResponse = {
  name: string;
  slug: string;
  timezone: string;
  procedures: Array<{ id: string; name: string; defaultMinutes: number }>;
  professionals: Array<{ id: string; name: string }>;
};

export type PublicBookingCreateResult = {
  bookingId: string;
  otpSentVia: 'EMAIL' | 'WHATSAPP';
  expiresInSeconds: number;
  debugOtp?: string;
};

export type PublicBookingVerifyResult = {
  appointment: AppointmentSummary;
  patient: {
    id: string;
    name: string;
    phonePrimary: string;
    origin: string;
    needsDataReview: boolean;
  };
  confirmationToken?: string;
};

export type PublicBookingTokenMeta = {
  otpHash?: string;
  attempts?: number;
  name?: string;
  phone?: string;
  email?: string | null;
  procedureId?: string;
  professionalId?: string;
  startsAt?: string;
  endsAt?: string;
  unitId?: string;
  waitlistEntryId?: string;
  cancelledAppointmentId?: string;
  batch?: number;
  idempotencyKey?: string;
  consentDataProcessing?: boolean;
  consentTerms?: boolean;
  consentWhatsappMarketing?: boolean;
  formId?: string;
  formVersion?: number;
  patientId?: string;
  quoteId?: string;
  publicUrl?: string;
};

export type PublicBookingTokenRow = {
  id: string;
  tenantId: string;
  purpose: string;
  targetId: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  meta: PublicBookingTokenMeta;
};
