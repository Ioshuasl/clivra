const SEP = ';';

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.includes(SEP) || text.includes('"') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function row(cells: Array<string | number | null | undefined>): string {
  return cells.map(escapeCell).join(SEP);
}

/** CSV UTF-8 com BOM e separador `;` (Excel pt-BR). */
export function buildCsv(headers: string[], lines: Array<Array<string | number | null | undefined>>): Buffer {
  const body = [row(headers), ...lines.map((line) => row(line))].join('\r\n');
  return Buffer.from('\uFEFF' + body, 'utf8');
}

export function csvNoShows(report: {
  items: Array<{
    appointmentId: string;
    status: string;
    startsAt: string;
    professionalName: string;
    procedureName: string | null;
    estimatedLossCents: number;
  }>;
}): Buffer {
  return buildCsv(
    [
      'appointmentId',
      'status',
      'startsAt',
      'professionalName',
      'procedureName',
      'estimatedLossCents',
    ],
    report.items.map((item) => [
      item.appointmentId,
      item.status,
      item.startsAt,
      item.professionalName,
      item.procedureName,
      item.estimatedLossCents,
    ]),
  );
}

export function csvRevenue(report: {
  groupBy: string;
  items: Array<{
    key: string;
    amountCents: number;
    count: number;
    professionalName?: string;
  }>;
}): Buffer {
  const headers =
    report.groupBy === 'professional'
      ? ['professionalName', 'amountCents', 'count']
      : ['period', 'amountCents', 'count'];
  return buildCsv(
    headers,
    report.items.map((item) =>
      report.groupBy === 'professional'
        ? [item.professionalName ?? item.key, item.amountCents, item.count]
        : [item.key, item.amountCents, item.count],
    ),
  );
}

export function csvProcedures(report: {
  items: Array<{ procedureName: string; count: number; executedCents: number }>;
}): Buffer {
  return buildCsv(
    ['procedureName', 'count', 'executedCents'],
    report.items.map((item) => [item.procedureName, item.count, item.executedCents]),
  );
}
