/** CSV UTF-8 BOM + separador `;` (Excel pt-BR). Money em cents inteiros. */

const BOM = '\uFEFF';
const SEP = ';';

function escapeCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  if (/[;"\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function buildCsv(headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>): Buffer {
  const lines = [
    headers.map(escapeCell).join(SEP),
    ...rows.map((row) => row.map(escapeCell).join(SEP)),
  ];
  return Buffer.from(BOM + lines.join('\r\n'), 'utf8');
}

export function reportExportStorageKey(tenantId: string, exportId: string): string {
  return `tenants/${tenantId}/reports/exports/${exportId}.csv`;
}
