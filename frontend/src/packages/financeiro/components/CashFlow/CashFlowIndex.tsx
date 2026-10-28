'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CASH_FLOW_BASES,
  CASH_FLOW_BASIS_LABELS,
  type CashFlowBasis,
} from '@/packages/financeiro/enum/Report/CashFlowBasisEnum';
import { PAYMENT_METHOD_LABELS } from '@/packages/financeiro/enum/Payment/PaymentMethodEnum';
import { financeiroErrorMessage } from '@/packages/financeiro/helpers/FinanceiroErrorMessage';
import { formatCents } from '@/packages/financeiro/helpers/FormatCents';
import { useCashFlowGetHook } from '@/packages/financeiro/hooks/Report/useCashFlowGetHook';
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

export function CashFlowIndex() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando fluxo…</p>}>
      <CashFlowIndexBody />
    </Suspense>
  );
}

function CashFlowIndexBody() {
  const searchParams = useSearchParams();
  const initial = monthRange();
  const [from, setFrom] = useState(isoDateOr(searchParams.get('from'), initial.from));
  const [to, setTo] = useState(isoDateOr(searchParams.get('to'), initial.to));
  const [basis, setBasis] = useState<CashFlowBasis>('CASH');
  const report = useCashFlowGetHook({ from, to, basis });

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Fluxo de caixa</h1>

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
        <NativeSelect
          aria-label="Regime"
          className="w-64"
          value={basis}
          onChange={(event) => setBasis(event.target.value as CashFlowBasis)}
        >
          {CASH_FLOW_BASES.map((item) => (
            <NativeSelectOption key={item} value={item}>
              {CASH_FLOW_BASIS_LABELS[item]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {report.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando fluxo…</p>
      ) : report.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{financeiroErrorMessage(report.error)}</AlertDescription>
        </Alert>
      ) : report.data ? (
        <>
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Saldo inicial</dt>
              <dd className="font-medium">{formatCents(report.data.openingBalanceCents)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Entradas</dt>
              <dd className="font-medium">{formatCents(report.data.inflowsCents)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Saídas</dt>
              <dd className="font-medium">{formatCents(report.data.outflowsCents)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Saldo final</dt>
              <dd className="font-medium">{formatCents(report.data.closingBalanceCents)}</dd>
            </div>
          </dl>

          <div>
            <h2 className="mb-2 text-sm font-medium">Por dia</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Entradas</TableHead>
                  <TableHead>Saídas</TableHead>
                  <TableHead>Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.data.byDay.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{formatCents(row.inflowsCents)}</TableCell>
                    <TableCell>{formatCents(row.outflowsCents)}</TableCell>
                    <TableCell>{formatCents(row.balanceCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {report.data.byPaymentMethod.length > 0 ? (
            <div>
              <h2 className="mb-2 text-sm font-medium">Por forma de pagamento</h2>
              <ul className="grid gap-1 text-sm">
                {report.data.byPaymentMethod.map((row) => (
                  <li key={row.method}>
                    {PAYMENT_METHOD_LABELS[row.method]}: {formatCents(row.amountCents)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
