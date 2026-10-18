export function formatAnamnesisAnswer(answer: unknown): string {
  if (answer == null) return '—';
  if (typeof answer === 'boolean') return answer ? 'Sim' : 'Não';
  if (typeof answer === 'string') return answer.trim() || '—';
  if (typeof answer === 'object' && 'value' in answer) {
    const row = answer as { value?: unknown; text?: unknown };
    const base =
      typeof row.value === 'boolean'
        ? row.value
          ? 'Sim'
          : 'Não'
        : typeof row.value === 'string' || typeof row.value === 'number'
          ? String(row.value)
          : '';
    const extra = typeof row.text === 'string' ? row.text.trim() : '';
    if (extra) return `${base} — ${extra}`;
    return base || '—';
  }
  return JSON.stringify(answer);
}

export function formatDateTimePt(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}
