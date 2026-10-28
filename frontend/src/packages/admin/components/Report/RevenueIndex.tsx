'use client';

import { formatPeriodLabelBr } from '@/shared/helpers/FormatDateBr';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ReportDetailShell } from '@/packages/admin/components/Report/ReportDetailShell';
import {
  REVENUE_GROUP_BYS,
  REVENUE_GROUP_BY_LABELS,
  type RevenueGroupBy,
} from '@/packages/admin/enum/Report/RevenueGroupByEnum';
import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import { formatCents } from '@/packages/admin/helpers/FormatCents';
import { isoDateOr, monthRangeIso } from '@/packages/admin/helpers/ReportPeriod';
import { useRevenueGetHook } from '@/packages/admin/hooks/Report/useRevenueGetHook';
import { useAuth } from '@/shared/auth/AuthProvider';
import { hasPermission } from '@/shared/auth/permissions';
import { ClivraPageHeader } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
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

export function RevenueIndex() {
  const searchParams = useSearchParams();
  const { me } = useAuth();
  const canFinancial = hasPermission(me, 'reports.financial');
  const initial = monthRangeIso();
  const [from, setFrom] = useState(() => isoDateOr(searchParams.get('from'), initial.from));
  const [to, setTo] = useState(() => isoDateOr(searchParams.get('to'), initial.to));
  const [groupBy, setGroupBy] = useState<RevenueGroupBy>('day');
  const report = useRevenueGetHook({ from, to, groupBy }, canFinancial);

  if (!canFinancial) {
    return (
      <div className="grid min-w-0 gap-4">
        <ClivraPageHeader title="Receita" description="Pagamentos recebidos no período." />
        <Alert variant="destructive">
          <AlertDescription>Relatório financeiro indisponível para o seu perfil.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ReportDetailShell
      title="Receita"
      description="Pagamentos recebidos no período — agrupe por dia, mês ou profissional."
      exportReport="revenue"
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
          <label className="grid gap-1 text-xs text-muted-foreground">
            Agrupar por
            <NativeSelect
              aria-label="Agrupar por"
              className="w-52"
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value as RevenueGroupBy)}
            >
              {REVENUE_GROUP_BYS.map((item) => (
                <NativeSelectOption key={item} value={item}>
                  {REVENUE_GROUP_BY_LABELS[item]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
        </div>
      }
    >
      {report.isLoading ? (
        <p className="py-6 text-sm text-muted-foreground">Carregando receita…</p>
      ) : report.isError ? (
        <Alert variant="destructive" className="my-4">
          <AlertDescription>{adminErrorMessage(report.error)}</AlertDescription>
        </Alert>
      ) : report.data ? (
        <div className="grid gap-3 py-2">
          <p className="text-sm text-muted-foreground">
            Total do período:{' '}
            <span className="font-semibold tabular-nums text-foreground">
              {formatCents(report.data.totalCents)}
            </span>
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.data.buckets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    Sem receita no período. Ajuste as datas ou registre pagamentos no Financeiro.
                  </TableCell>
                </TableRow>
              ) : (
                report.data.buckets.map((bucket) => (
                  <TableRow key={bucket.key}>
                    <TableCell>{formatPeriodLabelBr(bucket.label)}</TableCell>
                    <TableCell className="tabular-nums">{bucket.count}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCents(bucket.amountCents)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </ReportDetailShell>
  );
}
