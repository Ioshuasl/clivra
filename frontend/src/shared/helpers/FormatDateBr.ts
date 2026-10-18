/** `2026-10-19` → `19/10/2026` (formato que o brasileiro lê). Outros formatos voltam como vieram. */
export function formatIsoDateBr(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/** Rótulo de período de relatório: dia `2026-10-19` → `19/10/2026`; mês `2026-10` → `10/2026`. */
export function formatPeriodLabelBr(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatIsoDateBr(value);
  const month = /^(\d{4})-(\d{2})$/.exec(value);
  return month ? `${month[2]}/${month[1]}` : value;
}
