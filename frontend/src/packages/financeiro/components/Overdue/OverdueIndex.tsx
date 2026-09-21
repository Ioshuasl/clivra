'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { AGING_BAND_LABELS } from '@/packages/financeiro/enum/Report/AgingBandEnum';
import { RECEIPT_SEND_CHANNEL_LABELS } from '@/packages/financeiro/enum/Payment/ReceiptSendChannelEnum';
import { financeiroErrorMessage } from '@/packages/financeiro/helpers/FinanceiroErrorMessage';
import { formatCents } from '@/packages/financeiro/helpers/FormatCents';
import { useInstallmentChargeHook } from '@/packages/financeiro/hooks/Installment/useInstallmentChargeHook';
import { useOverdueGetHook } from '@/packages/financeiro/hooks/Report/useOverdueGetHook';
import { Can } from '@/shared/auth/Can';
import { ClivraPageHeader, ClivraSurface } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button, buttonVariants } from '@/shared/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import { cn } from '@/shared/helpers/utils';

export function OverdueIndex() {
  const report = useOverdueGetHook();
  const charge = useInstallmentChargeHook();
  const [copyText, setCopyText] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<string | null>(null);

  const onCharge = async (installmentId: string) => {
    setCopyText(null);
    const result = await charge.mutateAsync({
      installmentId,
      installmentChargeSchema: { channel: 'WHATSAPP' },
    });
    setLastSent(RECEIPT_SEND_CHANNEL_LABELS[result.sentVia]);
    if (result.copyText) setCopyText(result.copyText);
  };

  return (
    <div className="grid min-w-0 gap-4">
      <div>
        <Link
          href="/app/relatorios"
          className={cn(
            buttonVariants({ variant: 'link' }),
            'inline-flex h-auto cursor-pointer items-center gap-1.5 px-0',
          )}
        >
          <ArrowLeftIcon className="size-3.5" strokeWidth={1.8} />
          Voltar aos relatórios
        </Link>
      </div>

      <ClivraPageHeader
        title="Inadimplência"
        description="Parcelas vencidas por faixa de atraso — cobre direto pelo WhatsApp."
      />

      {charge.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{financeiroErrorMessage(charge.error)}</AlertDescription>
        </Alert>
      ) : null}
      {lastSent ? (
        <Alert>
          <AlertDescription>Cobrança enviada via {lastSent}.</AlertDescription>
        </Alert>
      ) : null}
      {copyText ? (
        <Alert>
          <AlertDescription>{copyText}</AlertDescription>
        </Alert>
      ) : null}

      {report.isLoading ? (
        <ClivraSurface contentClassName="px-4 py-6">
          <p className="text-sm text-muted-foreground">Carregando inadimplência…</p>
        </ClivraSurface>
      ) : report.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{financeiroErrorMessage(report.error)}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {(report.data?.buckets ?? []).map((bucket) => (
            <ClivraSurface
              key={bucket.band}
              toolbar={
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-base font-semibold">{AGING_BAND_LABELS[bucket.band]}</h2>
                  <p className="text-sm text-muted-foreground">
                    {bucket.count} parcela{bucket.count === 1 ? '' : 's'} ·{' '}
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatCents(bucket.totalCents)}
                    </span>
                  </p>
                </div>
              }
              contentClassName="px-4 py-2"
            >
              {bucket.items.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Nenhum item nesta faixa.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Dias</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bucket.items.map((item) => (
                      <TableRow key={item.installmentId}>
                        <TableCell>#{item.patientCode}</TableCell>
                        <TableCell className="tabular-nums">{item.dueDate}</TableCell>
                        <TableCell className="tabular-nums">{item.daysOverdue}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCents(item.remainingCents)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Can permission="finance.write">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer"
                              disabled={charge.isPending}
                              onClick={() => {
                                void onCharge(item.installmentId);
                              }}
                            >
                              Cobrar no WhatsApp
                            </Button>
                          </Can>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ClivraSurface>
          ))}

          {(report.data?.buckets ?? []).every((b) => b.count === 0) ? (
            <ClivraSurface contentClassName="px-4 py-6">
              <p className="text-sm text-muted-foreground">
                Sem parcelas em atraso. Volte ao Financeiro para acompanhar o vencimento do dia.
              </p>
            </ClivraSurface>
          ) : null}
        </div>
      )}
    </div>
  );
}
