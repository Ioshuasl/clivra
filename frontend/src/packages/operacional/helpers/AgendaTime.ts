import {
  addDays,
  addMinutes,
  differenceInMinutes,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AGENDA_TOKENS } from '@/packages/operacional/helpers/AgendaNotionTokens';

export function toYmd(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function dayLabel(date: Date): string {
  return format(date, "EEE d MMM", { locale: ptBR });
}

export function formatHour(date: Date): string {
  return format(date, 'HH:mm');
}

export function rangeIso(from: Date, to: Date): { from: string; to: string } {
  return { from: from.toISOString(), to: to.toISOString() };
}

export function weekRange(anchor: Date): { from: Date; to: Date } {
  const days = weekDays(anchor);
  const from = startOfDay(days[0]!);
  const to = addDays(startOfDay(days[6]!), 1);
  return { from, to };
}

export function dayRange(anchor: Date): { from: Date; to: Date } {
  const from = startOfDay(anchor);
  return { from, to: addDays(from, 1) };
}

/** Minutos desde dayStartHour no mesmo dia civil local. */
export function minutesFromGridStart(instant: Date): number {
  const start = new Date(instant);
  start.setHours(AGENDA_TOKENS.dayStartHour, 0, 0, 0);
  return Math.max(0, differenceInMinutes(instant, start));
}

export function gridHeightPx(): number {
  const minutes =
    (AGENDA_TOKENS.dayEndHour - AGENDA_TOKENS.dayStartHour) * 60;
  return minutes * AGENDA_TOKENS.pxPerMinute;
}

export function snapMinutes(value: number, slotMinutes: number): number {
  return Math.round(value / slotMinutes) * slotMinutes;
}

export function buildSlotStart(
  day: Date,
  minutesFromStart: number,
): Date {
  const base = startOfDay(day);
  base.setHours(AGENDA_TOKENS.dayStartHour, 0, 0, 0);
  return addMinutes(base, minutesFromStart);
}

export function hoursAxis(): Date[] {
  const base = startOfDay(new Date());
  base.setHours(AGENDA_TOKENS.dayStartHour, 0, 0, 0);
  const total = AGENDA_TOKENS.dayEndHour - AGENDA_TOKENS.dayStartHour;
  return Array.from({ length: total + 1 }, (_, i) => addMinutes(base, i * 60));
}

export function parseInstant(iso: string): Date {
  return parseISO(iso);
}

export function monthGridDays(anchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function monthRange(anchor: Date): { from: Date; to: Date } {
  const days = monthGridDays(anchor);
  return { from: startOfDay(days[0]!), to: addDays(startOfDay(days[41]!), 1) };
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function weekdayShort(date: Date): string {
  return format(date, 'EEE', { locale: ptBR }).replace('.', '');
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase();
}

/** Posição (px) do instante dentro da grade, ou null se fora do horário exibido. */
export function offsetPxInGrid(instant: Date): number | null {
  const minutes = minutesFromGridStart(instant);
  const total = (AGENDA_TOKENS.dayEndHour - AGENDA_TOKENS.dayStartHour) * 60;
  if (instant.getHours() < AGENDA_TOKENS.dayStartHour || minutes > total) return null;
  return minutes * AGENDA_TOKENS.pxPerMinute;
}
