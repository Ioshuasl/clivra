'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { financeiroErrorMessage } from '@/packages/financeiro/helpers/FinanceiroErrorMessage';
import { formatCents } from '@/packages/financeiro/helpers/FormatCents';
import { monthRangeIso } from '@/packages/financeiro/helpers/FinanceiroDate';
import { useCashFlowGetHook } from '@/packages/financeiro/hooks/Report/useCashFlowGetHook';
import { useProductionGetHook } from '@/packages/financeiro/hooks/Report/useProductionGetHook';
import { PAYMENT_METHOD_LABELS } from '@/packages/financeiro/enum/Payment/PaymentMethodEnum';
import { useAuth } from '@/shared/auth/AuthProvider';
import { ClivraPageHeader, ClivraSurface } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button, buttonVariants } from '@/shared/ui/button';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import { cn } from '@/shared/helpers/utils';

type CategoryView = 'categorias' | 'pagamentos';

function weekBuckets(byDay: Array<{ date: string; inflowsCents: number; outflowsCents: number }>) {
  const weeks = [
    { label: 'Sem 1', inflowsCents: 0, outflowsCents: 0 },
    { label: 'Sem 2', inflowsCents: 0, outflowsCents: 0 },
    { label: 'Sem 3', inflowsCents: 0, outflowsCents: 0 },
    { label: 'Sem 4', inflowsCents: 0, outflowsCents: 0 },
  ];
  for (const day of byDay) {
    const dayNum = Number(day.date.slice(8, 10));
    const index = Math.min(3, Math.floor((dayNum - 1) / 7));
    weeks[index]!.inflowsCents += day.inflowsCents;
    weeks[index]!.outflowsCents += day.outflowsCents;
  }
  return weeks;
}

export function FinanceReportsIndex() {
  const { me } = useAuth();
  const isDentist = me?.current.role === 'DENTIST';
  const initial = monthRangeIso();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [categoryView, setCategoryView] = useState<CategoryView>('categorias');

  const cashFlow = useCashFlowGetHook({ from, to, basis: 'CASH' });
  const production = useProductionGetHook({ from, to });

  const weeks = useMemo(
    () => weekBuckets(cashFlow.data?.byDay ?? []),
    [cashFlow.data?.byDay],
  );
  const maxBar = Math.max(
    1,
    ...weeks.flatMap((week) => [week.inflowsCents, week.outflowsCents]),
  );
  const productionItems = production.data?.items ?? [];
  const maxProduction = Math.max(1, ...productionItems.map((item) => item.executedCents));

  const monthLabel = useMemo(() => {
    const [year, month] = from.split('-');
    if (!year || !month) return from;
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [from]);

  const shiftMonth = (delta: number) => {
    const base = new Date(`${from}T12:00:00`);
    const next = new Date(base.getFullYear(), base.getMonth() + delta, 1);
    const range = monthRangeIso(next);
    setFrom(range.from);
    setTo(range.to);
  };

  const loading = cashFlow.isLoading || production.isLoading;
  const error = cashFlow.error ?? production.error;

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap gap-4">
        <Link
          href="/app/financeiro"
          className={cn(buttonVariants({ variant: 'link' }), 'h-auto cursor-pointer px-0')}
        >
          ← Voltar ao painel
        </Link>
        <Link
          href="/app/relatorios"
          className={cn(buttonVariants({ variant: 'link' }), 'h-auto cursor-pointer px-0')}
        >
          Ver todos os relatórios
        </Link>
      </div>

      <ClivraPageHeader
        title="Relatórios financeiros"
        description="Fluxo, produção e resumo do período — o mesmo relatório acessível por Relatórios."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="cursor-pointer"
                onClick={() => shiftMonth(-1)}
              >
                ‹
              </Button>
              <span className="min-w-36 px-2 text-center text-sm font-medium capitalize">
                {monthLabel}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="cursor-pointer"
                onClick={() => shiftMonth(1)}
              >
                ›
              </Button>
            </div>
            <NativeSelect
              aria-label="Período rápido"
              className="w-40"
              value={`${from}|${to}`}
              onChange={(event) => {
                const [nextFrom, nextTo] = event.target.value.split('|');
                if (nextFrom && nextTo) {
                  setFrom(nextFrom);
                  setTo(nextTo);
                }
              }}
            >
              <NativeSelectOption value={`${initial.from}|${initial.to}`}>
                Mês atual
              </NativeSelectOption>
            </NativeSelect>
          </div>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando relatórios…</p>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{financeiroErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <ClivraSurface contentClassName="px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Entradas no mês
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-success">
                {formatCents(cashFlow.data?.inflowsCents ?? 0)}
              </p>
            </ClivraSurface>
            <ClivraSurface contentClassName="px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Saídas no mês
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-destructive">
                {formatCents(cashFlow.data?.outflowsCents ?? 0)}
              </p>
            </ClivraSurface>
            <ClivraSurface contentClassName="px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Saldo do período
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-primary">
                {formatCents(cashFlow.data?.closingBalanceCents ?? 0)}
              </p>
            </ClivraSurface>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ClivraSurface contentClassName="px-4 py-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">Fluxo do mês</h2>
                  <p className="text-xs text-muted-foreground">
                    Entradas × saídas por semana — visão rápida.
                  </p>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2.5 rounded-sm bg-success" /> Entradas
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2.5 rounded-sm bg-destructive" /> Saídas
                  </span>
                </div>
              </div>
              <div className="flex h-44 items-end justify-between gap-3 border-b border-border pb-2">
                {weeks.map((week) => (
                  <div key={week.label} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-36 w-full items-end justify-center gap-1">
                      <div
                        className="w-3 rounded-t bg-success sm:w-4"
                        style={{ height: `${Math.max(4, (week.inflowsCents / maxBar) * 100)}%` }}
                        title={formatCents(week.inflowsCents)}
                      />
                      <div
                        className="w-3 rounded-t bg-destructive sm:w-4"
                        style={{ height: `${Math.max(4, (week.outflowsCents / maxBar) * 100)}%` }}
                        title={formatCents(week.outflowsCents)}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">{week.label}</span>
                  </div>
                ))}
              </div>
            </ClivraSurface>

            <ClivraSurface contentClassName="px-4 py-4">
              <div className="mb-4">
                <h2 className="text-base font-semibold">Produção por dentista</h2>
                <p className="text-xs text-muted-foreground">
                  {isDentist ? 'Exibindo apenas a sua produção.' : 'Quem mais produziu no período.'}
                </p>
              </div>
              {productionItems.length === 0 ? (
                <p className="py-8 text-sm text-muted-foreground">Nenhuma produção no período.</p>
              ) : (
                <ul className="grid gap-4">
                  {productionItems.map((item) => (
                    <li key={item.professionalId} className="grid gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{item.professionalName}</span>
                        <span className="text-xs font-semibold tabular-nums">
                          {formatCents(item.executedCents)}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.max(6, (item.executedCents / maxProduction) * 100)}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ClivraSurface>
          </div>

          <ClivraSurface
            toolbar={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">Resumo financeiro</h2>
                  <p className="text-xs text-muted-foreground">
                    O essencial do período — valores legíveis, sem planilha densa.
                  </p>
                </div>
                <div className="flex gap-1 rounded-lg bg-muted p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={categoryView === 'categorias' ? 'default' : 'ghost'}
                    className="cursor-pointer"
                    onClick={() => setCategoryView('categorias')}
                  >
                    Categorias
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={categoryView === 'pagamentos' ? 'default' : 'ghost'}
                    className={cn('cursor-pointer', categoryView !== 'pagamentos' && 'text-muted-foreground')}
                    onClick={() => setCategoryView('pagamentos')}
                  >
                    Pagamentos
                  </Button>
                </div>
              </div>
            }
            contentClassName="px-4 py-2"
          >
            {categoryView === 'categorias' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(cashFlow.data?.byCategory.inflows ?? []).map((row) => (
                    <TableRow key={`in-${row.category}`}>
                      <TableCell>{row.category}</TableCell>
                      <TableCell className="font-medium text-success">Entrada</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCents(row.amountCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(cashFlow.data?.byCategory.outflows ?? []).map((row) => (
                    <TableRow key={`out-${row.category}`}>
                      <TableCell>{row.category}</TableCell>
                      <TableCell className="font-medium text-destructive">Saída</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCents(row.amountCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(cashFlow.data?.byCategory.inflows.length ?? 0) === 0 &&
                  (cashFlow.data?.byCategory.outflows.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        Sem categorias no período.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Forma</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(cashFlow.data?.byPaymentMethod ?? []).map((row) => (
                    <TableRow key={row.method}>
                      <TableCell>{PAYMENT_METHOD_LABELS[row.method] ?? row.method}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCents(row.amountCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(cashFlow.data?.byPaymentMethod.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground">
                        Sem pagamentos no período.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            )}
          </ClivraSurface>
        </>
      )}
    </div>
  );
}
