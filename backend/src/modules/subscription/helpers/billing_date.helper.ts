/** Data civil `YYYY-MM-DD` no fuso do tenant (nunca depende do fuso do servidor). */
export function civilDateIn(timezone: string, at: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

export function maxCivilDate(a: string, b: string): string {
  return a >= b ? a : b;
}

function parseCivil(ymd: string): Date {
  return new Date(`${ymd.slice(0, 10)}T12:00:00.000Z`);
}

export function civilToDate(ymd: string): Date {
  return parseCivil(ymd);
}

export function addMonthsCivil(ymd: string, months: number): string {
  const d = parseCivil(ymd);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}

export function daysBetweenCivil(from: string, to: string): number {
  return Math.round((parseCivil(to).getTime() - parseCivil(from).getTime()) / 86_400_000);
}
