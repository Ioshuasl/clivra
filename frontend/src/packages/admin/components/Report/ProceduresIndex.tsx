'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ReportDetailShell } from '@/packages/admin/components/Report/ReportDetailShell';
import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import { formatCents } from '@/packages/admin/helpers/FormatCents';
import { isoDateOr, monthRangeIso } from '@/packages/admin/helpers/ReportPeriod';
import { useProceduresGetHook } from '@/packages/admin/hooks/Report/useProceduresGetHook';
import { useAuth } from '@/shared/auth/AuthProvider';
import { hasPermission } from '@/shared/auth/permissions';
import { ClivraPageHeader } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import { DatePicker } from '@/shared/ui/date-picker';
import { dateToIso, isoToRange } from '@/shared/helpers/DateIso';

export function ProceduresIndex() {
  const searchParams = useSearchParams();
  const { me } = useAuth();
  const canRead = hasPermission(me, 'reports.read');
  const isDentist = me?.current.role === 'DENTIST';
  const initial = monthRangeIso();
  const [from, setFrom] = useState(() => isoDateOr(searchParams.get('from'), initial.from));
  const [to, setTo] = useState(() => isoDateOr(searchParams.get('to'), initial.to));
  const report = useProceduresGetHook({ from, to }, canRead);

  if (!canRead) {
    return (
      <div className="grid min-w-0 gap-4">
        <ClivraPageHeader
          title="Procedimentos"
          description="Produção agregada por procedimento."
        />
        <Alert variant="destructive">
          <AlertDescription>Você não tem permissão para ver este relatório.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ReportDetailShell
      title="Procedimentos"
      description={
        isDentist
          ? 'Seus procedimentos realizados no período.'
          : 'Mix de serviços realizados na clínica no período.'
      }
      exportReport="procedures"
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Período
            <DatePicker
              mode="range"
              clearable={false}
              aria-label="Período"
              className="w-72"
              value={isoToRange(from, to)}
              onChange={(range) => {
                setFrom(dateToIso(range?.from));
                setTo(dateToIso(range?.to));
              }}
            />
          </label>
        </div>
      }
    >
      {report.isLoading ? (
        <p className="py-6 text-sm text-muted-foreground">Carregando procedimentos…</p>
      ) : report.isError ? (
        <Alert variant="destructive" className="my-4">
          <AlertDescription>{adminErrorMessage(report.error)}</AlertDescription>
        </Alert>
      ) : report.data ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Procedimento</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Nenhum procedimento no período. Ajuste as datas para ver o histórico.
                </TableCell>
              </TableRow>
            ) : (
              report.data.items.map((item) => (
                <TableRow key={item.procedureId}>
                  <TableCell className="tabular-nums">{item.procedureCode}</TableCell>
                  <TableCell>{item.procedureName}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.count}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(item.totalCents)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      ) : null}
    </ReportDetailShell>
  );
}
