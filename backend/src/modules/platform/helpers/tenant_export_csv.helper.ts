const SEP = ';';

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.includes(SEP) || text.includes('"') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** CSV UTF-8 com BOM e `;` (Excel pt-BR). Money em cents inteiros. */
export function buildCsv(
  headers: string[],
  lines: Array<Array<string | number | null | undefined>>,
): Buffer {
  const body = [headers.map(escapeCell).join(SEP), ...lines.map((line) => line.map(escapeCell).join(SEP))].join(
    '\r\n',
  );
  return Buffer.from(`\uFEFF${body}`, 'utf8');
}

export function jsonFile(value: unknown): Buffer {
  return Buffer.from(
    `${JSON.stringify(
      value,
      (_key: string, current: unknown): unknown => {
        if (typeof current === 'bigint') return Number(current);
        if (current instanceof Date) return current.toISOString();
        return current;
      },
      2,
    )}\n`,
    'utf8',
  );
}
