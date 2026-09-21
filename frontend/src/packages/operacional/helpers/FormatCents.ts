export function formatCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function reaisInputToCents(value: string): number {
  const trimmed = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!trimmed) return 0;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100);
}

/** Valor em reais para input (ex.: 12.5 → "12,50"). */
export function centsToReaisInput(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return '0';
  return (cents / 100).toFixed(2).replace('.', ',');
}
