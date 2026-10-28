/** Datas civis (AAAA-MM-DD) ⇄ `Date` local. Sempre no relógio local, sem deslocamento de fuso (UTC). */

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})/;

/** `2026-10-19` → `Date` às 00:00 locais. Texto vazio ou inválido → `undefined`. */
export function isoToDate(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined;
  const match = ISO_DAY.exec(iso);
  if (!match) return undefined;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) || date.getMonth() !== Number(month) - 1 ? undefined : date;
}

/** `Date` → `2026-10-19` (dia local). `undefined` → texto vazio. */
export function dateToIso(date: Date | null | undefined): string {
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Dois textos AAAA-MM-DD → período para o `DatePicker`. Sem os dois lados válidos → `undefined`. */
export function isoToRange(
  from: string | null | undefined,
  to: string | null | undefined,
): { from: Date; to: Date } | undefined {
  const start = isoToDate(from)
  const end = isoToDate(to)
  return start && end ? { from: start, to: end } : undefined
}
