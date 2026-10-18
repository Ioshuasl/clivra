export function todayInTimezone(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function hourInTimezone(timezone: string, now = new Date()): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  return Number(hour);
}

export function civilDateUtc(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function zoneOffsetMs(utcMs: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - utcMs;
}

/** Instante (UTC) em que o dia civil `isoDate` começa no fuso da clínica (ex.: 00:00 BRT = 03:00Z). */
export function zonedDayStartUtc(isoDate: string, timezone: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  const guess = Date.UTC(y!, m! - 1, d);
  const first = guess - zoneOffsetMs(guess, timezone);
  const second = guess - zoneOffsetMs(first, timezone);
  return new Date(second);
}

/** Início do dia seguinte a `isoDate` no fuso da clínica (limite exclusivo do período). */
export function zonedDayEndExclusiveUtc(isoDate: string, timezone: string): Date {
  const next = new Date(`${isoDate}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return zonedDayStartUtc(next.toISOString().slice(0, 10), timezone);
}
