/** Converte horário de parede (HH:mm) no fuso do tenant em instante UTC. */
export function wallTimeToUtc(dateYmd: string, hhmm: string, timeZone: string): Date {
  const [year, month, day] = dateYmd.split('-').map(Number);
  const [hour, minute] = hhmm.split(':').map(Number);
  if (!year || !month || !day || hour === undefined || minute === undefined) {
    throw new Error(`Horário inválido: ${dateYmd} ${hhmm}`);
  }

  const desiredAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = desiredAsUtcMs;

  for (let i = 0; i < 4; i += 1) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(guess));

    const read = (type: Intl.DateTimeFormatPartTypes): number => {
      const value = parts.find((part) => part.type === type)?.value;
      return Number(value);
    };

    let localHour = read('hour');
    if (localHour === 24) localHour = 0;

    const asLocalMs = Date.UTC(
      read('year'),
      read('month') - 1,
      read('day'),
      localHour,
      read('minute'),
      read('second'),
    );
    guess += desiredAsUtcMs - asLocalMs;
  }

  return new Date(guess);
}

export function todayInTimezone(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function addCivilDays(dateYmd: string, days: number): string {
  const [year, month, day] = dateYmd.split('-').map(Number);
  const utc = new Date(Date.UTC(year!, month! - 1, day! + days));
  return utc.toISOString().slice(0, 10);
}

export function monthStart(dateYmd: string): string {
  return `${dateYmd.slice(0, 7)}-01`;
}

export function nextMonthStart(dateYmd: string): string {
  const [year, month] = dateYmd.split('-').map(Number);
  const next = month === 12 ? { y: year! + 1, m: 1 } : { y: year!, m: month! + 1 };
  return `${String(next.y).padStart(4, '0')}-${String(next.m).padStart(2, '0')}-01`;
}

export function dayBoundsUtc(dateYmd: string, timeZone: string): { start: Date; endExclusive: Date } {
  return {
    start: wallTimeToUtc(dateYmd, '00:00', timeZone),
    endExclusive: wallTimeToUtc(addCivilDays(dateYmd, 1), '00:00', timeZone),
  };
}

export function periodBoundsUtc(
  from: string,
  to: string,
  timeZone: string,
): { start: Date; endExclusive: Date } {
  return {
    start: wallTimeToUtc(from, '00:00', timeZone),
    endExclusive: wallTimeToUtc(addCivilDays(to, 1), '00:00', timeZone),
  };
}

export function civilDateInTimezone(instant: Date, timeZone: string): string {
  return todayInTimezone(timeZone, instant);
}

export function civilMonthInTimezone(instant: Date, timeZone: string): string {
  return civilDateInTimezone(instant, timeZone).slice(0, 7);
}

export function inclusiveDayCount(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00.000Z`);
  const b = Date.parse(`${to}T00:00:00.000Z`);
  return Math.floor((b - a) / 86_400_000) + 1;
}

export function civilDateUtc(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
