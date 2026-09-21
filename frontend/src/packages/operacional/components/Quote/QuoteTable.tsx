'use client';

import type { MouseEvent, ReactNode } from 'react';
import {
  CheckCheckIcon,
  CopyPlusIcon,
  FileTextIcon,
  PencilIcon,
  SendIcon,
} from 'lucide-react';
import {
  QUOTE_DUPLICATE_STATUSES,
  QUOTE_STATUS_LABELS,
  type QuoteStatus,
} from '@/packages/operacional/enum/Quote/QuoteStatusEnum';
import { formatCents } from '@/packages/operacional/helpers/FormatCents';
import type { QuoteTableProps } from '@/packages/operacional/types/Quote/QuoteTableTypes';
import type { QuoteSummary } from '@/packages/operacional/types/Quote/QuoteTypes';
import { Can } from '@/shared/auth/Can';
import { cn } from '@/shared/helpers/utils';
import { Button } from '@/shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

const STATUS_CHIP: Record<QuoteStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SENT: 'bg-primary/10 text-primary',
  APPROVED: 'bg-emerald-50 text-emerald-800',
  PARTIALLY_APPROVED: 'bg-amber-50 text-amber-900',
  REJECTED: 'bg-rose-50 text-rose-800',
  EXPIRED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-muted text-muted-foreground',
};

const STATUS_DOT: Record<QuoteStatus, string> = {
  DRAFT: 'bg-muted-foreground/50',
  SENT: 'bg-primary',
  APPROVED: 'bg-emerald-600',
  PARTIALLY_APPROVED: 'bg-amber-500',
  REJECTED: 'bg-rose-600',
  EXPIRED: 'bg-muted-foreground/50',
  CANCELLED: 'bg-muted-foreground/40',
};

function formatValidUntil(value: string | null): string {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  if (year && month && day && year.length === 4) {
    return `${day}/${month}/${year}`;
  }
  return value;
}

function stopRowClick(event: MouseEvent) {
  event.stopPropagation();
}

function ActionIcon({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label={label}
            disabled={disabled}
            onClick={(event) => {
              stopRowClick(event);
              onClick();
            }}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function QuoteRowActions({
  quote,
  onEdit,
  onSend,
  onDecide,
  onDuplicate,
  onPdf,
  duplicatingId,
  pdfLoadingId,
}: {
  quote: QuoteSummary;
  onEdit: (quote: QuoteSummary) => void;
  onSend: (quote: QuoteSummary) => void;
  onDecide: (quote: QuoteSummary) => void;
  onDuplicate: (quote: QuoteSummary) => void;
  onPdf: (quote: QuoteSummary) => void;
  duplicatingId?: string | null;
  pdfLoadingId?: string | null;
}) {
  return (
    <div className="flex items-center justify-end gap-0.5" onClick={stopRowClick}>
      {quote.status === 'DRAFT' ? (
        <Can permission="quotes.write">
          <ActionIcon label="Editar" onClick={() => onEdit(quote)}>
            <PencilIcon strokeWidth={1.7} />
          </ActionIcon>
          <ActionIcon label="Enviar" onClick={() => onSend(quote)}>
            <SendIcon strokeWidth={1.7} />
          </ActionIcon>
        </Can>
      ) : null}
      {quote.status === 'SENT' ? (
        <Can permission="quotes.write">
          <ActionIcon label="Decidir" onClick={() => onDecide(quote)}>
            <CheckCheckIcon strokeWidth={1.7} />
          </ActionIcon>
        </Can>
      ) : null}
      {QUOTE_DUPLICATE_STATUSES.includes(quote.status) ? (
        <Can permission="quotes.write">
          <ActionIcon
            label="Duplicar"
            disabled={duplicatingId === quote.id}
            onClick={() => onDuplicate(quote)}
          >
            <CopyPlusIcon strokeWidth={1.7} />
          </ActionIcon>
        </Can>
      ) : null}
      {quote.status !== 'DRAFT' ? (
        <ActionIcon
          label="Abrir PDF"
          disabled={pdfLoadingId === quote.id}
          onClick={() => onPdf(quote)}
        >
          <FileTextIcon strokeWidth={1.7} />
        </ActionIcon>
      ) : null}
    </div>
  );
}

export function QuoteTable({
  quotes,
  patientNames,
  loading,
  onRowClick,
  onEdit,
  onSend,
  onDecide,
  onDuplicate,
  onPdf,
  duplicatingId,
  pdfLoadingId,
}: QuoteTableProps) {
  if (loading) {
    return (
      <div className="grid gap-2 p-4" aria-busy="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-11 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
        <p className="text-sm font-medium text-foreground">Nenhum orçamento encontrado</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Ajuste os filtros ou crie um novo orçamento.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-[44rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-border/80 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            <th className="px-4 py-2.5 font-semibold">Nº</th>
            <th className="px-3 py-2.5 font-semibold">Paciente</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
            <th className="px-3 py-2.5 font-semibold">Total</th>
            <th className="px-3 py-2.5 font-semibold">Validade</th>
            <th className="px-3 py-2.5 text-right font-semibold">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => {
            const patientLabel = patientNames[quote.patientId] ?? 'Paciente';
            return (
              <tr
                key={quote.id}
                tabIndex={0}
                role="button"
                aria-label={`Abrir orçamento ${quote.number} de ${patientLabel}`}
                className={cn(
                  'cursor-pointer border-b border-border/80 transition-colors',
                  'hover:bg-muted/40 focus-visible:bg-muted/60 focus-visible:outline-none',
                )}
                onClick={() => onRowClick(quote)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onRowClick(quote);
                  }
                }}
              >
                <td className="px-4 py-3 text-sm font-semibold tabular-nums text-primary">
                  {quote.number}
                </td>
                <td className="px-3 py-3">
                  <p className="truncate text-sm font-semibold text-foreground">{patientLabel}</p>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
                      STATUS_CHIP[quote.status],
                    )}
                  >
                    <span
                      className={cn('size-1.5 rounded-full', STATUS_DOT[quote.status])}
                      aria-hidden
                    />
                    {QUOTE_STATUS_LABELS[quote.status]}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm tabular-nums text-foreground">
                  {formatCents(quote.totalCents)}
                </td>
                <td className="px-3 py-3 text-sm tabular-nums text-muted-foreground">
                  {formatValidUntil(quote.validUntil)}
                </td>
                <td className="px-3 py-2">
                  <QuoteRowActions
                    quote={quote}
                    onEdit={onEdit}
                    onSend={onSend}
                    onDecide={onDecide}
                    onDuplicate={onDuplicate}
                    onPdf={onPdf}
                    duplicatingId={duplicatingId}
                    pdfLoadingId={pdfLoadingId}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
