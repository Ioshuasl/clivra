import { randomInt } from 'node:crypto';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import type { BookingSettings } from '../../clinic/clinic_public.js';

export const OTP_TTL_SECONDS = 300;
export const OTP_MAX_ATTEMPTS = 3;

export function assertLeadTime(startsAt: Date, settings: BookingSettings, now = new Date()): void {
  const minMs = settings.minLeadMinutes * 60_000;
  const maxMs = settings.maxLeadDays * 24 * 60 * 60_000;
  if (startsAt.getTime() < now.getTime() + minMs) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Horário abaixo da antecedência mínima para agendamento público.',
      422,
    );
  }
  if (startsAt.getTime() > now.getTime() + maxMs) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Horário além do horizonte máximo de agendamento público.',
      422,
    );
  }
}

export function isWithinLeadWindow(startsAt: Date, settings: BookingSettings, now = new Date()): boolean {
  const minMs = settings.minLeadMinutes * 60_000;
  const maxMs = settings.maxLeadDays * 24 * 60 * 60_000;
  const t = startsAt.getTime();
  return t >= now.getTime() + minMs && t <= now.getTime() + maxMs;
}

export function addDaysYmd(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number);
  if (!year || !month || !day) return ymd;
  const dt = new Date(Date.UTC(year, month - 1, day + days));
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}
