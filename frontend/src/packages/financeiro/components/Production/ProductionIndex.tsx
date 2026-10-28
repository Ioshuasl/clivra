'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { financeiroErrorMessage } from '@/packages/financeiro/helpers/FinanceiroErrorMessage';
import { formatCents } from '@/packages/financeiro/helpers/FormatCents';
import { useProfessionalListHook } from '@/packages/financeiro/hooks/Professional/useProfessionalListHook';
import { useProductionGetHook } from '@/packages/financeiro/hooks/Report/useProductionGetHook';
import { useAuth } from '@/shared/auth/AuthProvider';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
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

function ymd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthRange(): { from: string; to: string } {
  const now = new Date();
  return {
    from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function isoDateOr(value: string | null, fallback: string): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

export function ProductionIndex() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando produção…</p>}>
      <ProductionIndexBody />
    </Suspense>
  );
}

function ProductionIndexBody() {
  const { me } = useAuth();
  const isDentist = me?.current.role === 'DENTIST';
  const searchParams = useSearchParams();
  const initial = monthRange();
  const [from, setFrom] = useState(isoDateOr(searchParams.get('from'), initial.from));
  const [to, setTo] = useState(isoDateOr(searchParams.get('to'), initial.to));
  const [professionalId, setProfessionalId] = useState('');
  const professionals = useProfessionalListHook(!isDentist);
  const report = useProductionGetHook({
    from,
    to,
    professionalId: !isDentist && professionalId ? professionalId : undefined,
  });

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Produção</h1>
      {isDentist ? (
        <p className="text-sm text-muted-foreground">Exibindo apenas a sua produção.</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
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
        {!isDentist ? (
          <NativeSelect
            aria-label="Profissional"
            className="w-64"
            value={professionalId}
            onChange={(event) => setProfessionalId(event.target.value)}
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {(professionals.data ?? [])
              .filter((item) => item.active)
              .map((item) => (
                <NativeSelectOption key={item.id} value={item.id}>
                  {item.name}
                </NativeSelectOption>
              ))}
          </NativeSelect>
        ) : null}
      </div>

      {report.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando produção…</p>
      ) : report.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{financeiroErrorMessage(report.error)}</AlertDescription>
        </Alert>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Procedimentos</TableHead>
                <TableHead>Executado</TableHead>
                <TableHead>Recebido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(report.data?.items ?? []).map((item) => (
                <TableRow key={item.professionalId}>
                  <TableCell>{item.professionalName}</TableCell>
                  <TableCell>{item.proceduresCount}</TableCell>
                  <TableCell>{formatCents(item.executedCents)}</TableCell>
                  <TableCell>{formatCents(item.receivedCents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div>
            <h2 className="mb-2 text-sm font-medium">Detalhe</h2>
            {(report.data?.rows.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma execução no período.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Procedimento</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(report.data?.rows ?? []).map((row, index) => (
                    <TableRow key={`${row.professionalId}-${row.executedAt}-${index}`}>
                      <TableCell>{row.executedAt.slice(0, 10)}</TableCell>
                      <TableCell>{row.professionalName}</TableCell>
                      <TableCell>{row.procedureName}</TableCell>
                      <TableCell>#{row.patientCode}</TableCell>
                      <TableCell>{formatCents(row.executedCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
