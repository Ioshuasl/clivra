/** Data de hoje no relógio do usuário (AAAA-MM-DD). Não usa UTC: depois das 21h em Brasília ainda é "hoje". */
export function todayIsoDate(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return todayIsoDate(date);
}

export function monthRangeIso(date = new Date()): { from: string; to: string } {
  const from = todayIsoDate(new Date(date.getFullYear(), date.getMonth(), 1));
  const to = todayIsoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  return { from, to };
}

export function formatIsoDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  if (!month || !day) return isoDate;
  return `${day}/${month}`;
}

export function remainingCents(amountCents: number, paidCents: number): number {
  return Math.max(0, amountCents - paidCents);
}
