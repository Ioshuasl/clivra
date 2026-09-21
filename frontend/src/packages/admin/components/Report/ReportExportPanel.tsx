'use client';

import { useMemo, useState } from 'react';
import {
  EXPORTABLE_REPORTS,
  EXPORTABLE_REPORT_LABELS,
  type ExportableReport,
} from '@/packages/admin/enum/Report/ExportableReportEnum';
import { EXPORT_STATUS_LABELS } from '@/packages/admin/enum/Report/ExportStatusEnum';
import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import { monthRangeIso, todayIso } from '@/packages/admin/helpers/ReportPeriod';
import { useReportExportCreateHook } from '@/packages/admin/hooks/Report/useReportExportCreateHook';
import { useReportExportGetHook } from '@/packages/admin/hooks/Report/useReportExportGetHook';
import { useAuth } from '@/shared/auth/AuthProvider';
import { hasPermission } from '@/shared/auth/permissions';
import { ClivraSurface } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';

type ReportExportPanelProps = {
  defaultReport?: ExportableReport;
  /** When true, the report type cannot be changed (contextual export on detail pages). */
  lockedReport?: boolean;
};

export function ReportExportPanel({
  defaultReport = 'dashboard',
  lockedReport = false,
}: ReportExportPanelProps) {
  const { me } = useAuth();
  const canFinancial = hasPermission(me, 'reports.financial');
  const initial = monthRangeIso();
  const [report, setReport] = useState<ExportableReport>(defaultReport);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [date, setDate] = useState(todayIso());
  const [exportId, setExportId] = useState<string | null>(null);

  const create = useReportExportCreateHook();
  const exportQuery = useReportExportGetHook(exportId);

  const availableReports = useMemo(
    () =>
      EXPORTABLE_REPORTS.filter((item) => {
        if (item === 'no-shows' || item === 'revenue') return canFinancial;
        return true;
      }),
    [canFinancial],
  );

  const onExport = () => {
    const body =
      report === 'dashboard'
        ? { format: 'CSV' as const, date }
        : { format: 'CSV' as const, from, to };
    create.mutate(
      { report, body },
      {
        onSuccess: (result) => {
          setExportId(result.exportId);
        },
      },
    );
  };

  const status = exportQuery.data?.status;
  const downloadUrl = exportQuery.data?.downloadUrl;

  return (
    <div data-testid="report-export-panel">
      <ClivraSurface
        toolbar={
          <div className="grid gap-1">
            <h2 className="text-base font-semibold">Exportar CSV</h2>
            <p className="text-xs text-muted-foreground">
              O arquivo é gerado em segundo plano. Quando ficar pronto, baixe pelo link (válido por
              15 minutos).
            </p>
          </div>
        }
        contentClassName="grid gap-3 px-4 py-4"
      >
        <div className="flex flex-wrap gap-3">
          {lockedReport ? (
            <p className="flex h-10 items-center rounded-lg border border-border bg-muted/40 px-3 text-sm font-medium">
              {EXPORTABLE_REPORT_LABELS[report]}
            </p>
          ) : (
            <NativeSelect
              aria-label="Relatório"
              className="w-52"
              value={report}
              onChange={(event) => setReport(event.target.value as ExportableReport)}
            >
              {availableReports.map((item) => (
                <NativeSelectOption key={item} value={item}>
                  {EXPORTABLE_REPORT_LABELS[item]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}

          {report === 'dashboard' ? (
            <Input
              type="date"
              aria-label="Data do dashboard"
              className="w-40"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          ) : (
            <>
              <Input
                type="date"
                aria-label="De"
                className="w-40"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
              <Input
                type="date"
                aria-label="Até"
                className="w-40"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </>
          )}

          <Button
            type="button"
            className="cursor-pointer"
            disabled={create.isPending}
            onClick={onExport}
          >
            {create.isPending ? 'Solicitando…' : 'Gerar arquivo'}
          </Button>
        </div>

        {create.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{adminErrorMessage(create.error)}</AlertDescription>
          </Alert>
        ) : null}

        {exportId ? (
          <Alert>
            <AlertTitle>
              Status: {status ? EXPORT_STATUS_LABELS[status] : 'Consultando…'}
            </AlertTitle>
            <AlertDescription className="grid gap-2">
              {exportQuery.isError ? adminErrorMessage(exportQuery.error) : null}
              {status === 'FAILED' ? exportQuery.data?.error ?? 'Falha ao gerar o arquivo.' : null}
              {status === 'READY' && downloadUrl ? (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary underline"
                >
                  Baixar CSV
                </a>
              ) : null}
              {status === 'PENDING' || status === 'RUNNING' ? (
                <span className="text-muted-foreground">Aguardando o arquivo ficar pronto…</span>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}
      </ClivraSurface>
    </div>
  );
}
