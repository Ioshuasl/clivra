'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ReportDetailShell } from '@/packages/admin/components/Report/ReportDetailShell';
import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import { formatCents } from '@/packages/admin/helpers/FormatCents';
import { isoDateOr, monthRangeIso } from '@/packages/admin/helpers/ReportPeriod';
import { useNoShowsGetHook } from '@/packages/admin/hooks/Report/useNoShowsGetHook';
import { useAuth } from '@/shared/auth/AuthProvider';
import { hasPermission } from '@/shared/auth/permissions';
import { ClivraPageHeader } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Input } from '@/shared/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

export function NoShowsIndex() {
  const searchParams = useSearchParams();
  const { me } = useAuth();
  const canFinancial = hasPermission(me, 'reports.financial');
  const initial = monthRangeIso();
  const [from, setFrom] = useState(() => isoDateOr(searchParams.get('from'), initial.from));
  const [to, setTo] = useState(() => isoDateOr(searchParams.get('to'), initial.to));
  const report = useNoShowsGetHook({ from, to }, canFinancial);

  if (!canFinancial) {
    return (
      <div className="grid min-w-0 gap-4">
        <ClivraPageHeader title="Faltas" description="No-shows e cancelamentos no período." />
        <Alert variant="destructive">
          <AlertDescription>Relatório financeiro indisponível para o seu perfil.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ReportDetailShell
      title="Faltas"
      description="No-shows, cancelamentos e perda estimada no período."
      exportReport="no-shows"
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs text-muted-foreground">
            De
            <Input
              type="date"
              aria-label="De"
              className="w-40"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Até
            <Input
              type="date"
              aria-label="Até"
              className="w-40"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
        </div>
      }
    >
      {report.isLoading ? (
        <p className="py-6 text-sm text-muted-foreground">Carregando faltas…</p>
      ) : report.isError ? (
        <Alert variant="destructive" className="my-4">
          <AlertDescription>{adminErrorMessage(report.error)}</AlertDescription>
        </Alert>
      ) : report.data ? (
        <div className="grid gap-4 py-2">
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/80 bg-muted/30 px-3 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Faltas
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{report.data.noShowCount}</dd>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/30 px-3 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Cancelamentos
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">
                {report.data.cancelledCount}
              </dd>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/30 px-3 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Perda estimada
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-destructive">
                {formatCents(report.data.estimatedLossCents)}
              </dd>
            </div>
          </dl>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Procedimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Perda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Nenhuma falta no período. Bom sinal — continue acompanhando a confirmação.
                  </TableCell>
                </TableRow>
              ) : (
                report.data.items.map((item) => (
                  <TableRow key={item.appointmentId}>
                    <TableCell>#{item.patientCode}</TableCell>
                    <TableCell>{item.professionalName}</TableCell>
                    <TableCell>{item.procedureName ?? '—'}</TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCents(item.estimatedLossCents)}
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
