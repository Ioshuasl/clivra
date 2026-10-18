'use client';

import Link from 'next/link';
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, MoreVerticalIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { DashboardAppointmentSummary } from '@/packages/admin/types/Dashboard/DashboardAppointmentTypes';
import { cn } from '@/shared/helpers/utils';

const STATUS_UI: Record<string, { label: string; className: string; dot: string }> = {
  CONFIRMED: {
    label: 'Confirmado',
    className: 'bg-success/10 text-success',
    dot: 'bg-success',
  },
  SCHEDULED: {
    label: 'Agendado',
    className: 'bg-warning/15 text-warning',
    dot: 'bg-warning',
  },
  REQUESTED: {
    label: 'Solicitado',
    className: 'bg-warning/15 text-warning',
    dot: 'bg-warning',
  },
  CHECKED_IN: {
    label: 'Chegou',
    className: 'bg-warning/15 text-warning',
    dot: 'bg-warning',
  },
  IN_SERVICE: {
    label: 'Em atendimento',
    className: 'bg-info/15 text-info',
    dot: 'bg-info',
  },
  COMPLETED: {
    label: 'Concluído',
    className: 'bg-success/10 text-success',
    dot: 'bg-success',
  },
  CANCELLED: {
    label: 'Cancelado',
    className: 'bg-destructive/10 text-destructive',
    dot: 'bg-destructive',
  },
  NO_SHOW: {
    label: 'Faltou',
    className: 'bg-destructive/10 text-destructive',
    dot: 'bg-destructive',
  },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return (parts[0] ?? 'P').slice(0, 2).toUpperCase();
}

function formatPhone(phone: string | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function professionalLabel(name: string | undefined): string {
  if (!name) return '—';
  const trimmed = name.trim();
  if (/^dr[a]?\.?\s/i.test(trimmed)) return trimmed;
  return `Dr(a). ${trimmed}`;
}

type DashboardUpcomingAppointmentsProps = {
  title: string;
  items: DashboardAppointmentSummary[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  agendaHref: string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function DashboardUpcomingAppointments({
  title,
  items,
  total,
  page,
  totalPages,
  pageSize,
  onPageChange,
  agendaHref,
  loading,
  emptyTitle = 'Nenhum atendimento',
  emptyDescription = 'Não há atendimentos para a data selecionada.',
}: DashboardUpcomingAppointmentsProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const showPagination = totalPages > 1;

  return (
    <section className="flex h-full min-h-[18rem] min-w-0 flex-col overflow-hidden rounded-[12px] border border-border bg-card">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-3">
        <h2 className="inline-flex min-w-0 items-center gap-2 text-[15px] font-semibold text-foreground">
          <CalendarDaysIcon className="size-3.5 shrink-0 text-primary" strokeWidth={1.7} />
          <span className="truncate">{title}</span>
        </h2>
        <Link
          href={agendaHref}
          prefetch={false}
          className="shrink-0 text-[12px] font-medium text-primary transition-opacity hover:opacity-80"
        >
          Ver na agenda →
        </Link>
      </header>

      <div className="min-h-0 min-w-0 flex-1 overflow-auto border-t border-border">
        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Carregando…</p>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{emptyDescription}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((row) => {
              const name = row.patient?.name ?? 'Paciente';
              const status = STATUS_UI[row.status] ?? {
                label: row.status,
                className: 'bg-muted text-muted-foreground',
                dot: 'bg-muted-foreground',
              };
              return (
                <li key={row.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="w-12 shrink-0 pt-0.5">
                    <p className="text-[15px] font-semibold tabular-nums text-foreground">
                      {format(new Date(row.startsAt), 'HH:mm')}
                    </p>
                  </div>

                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-primary">
                    {initials(name)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-foreground sm:truncate">{name}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground sm:truncate">
                      {row.procedure?.name ?? 'Consulta'}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground/80 sm:truncate">
                      {professionalLabel(row.professional?.name)}
                      {row.patient?.phonePrimary ? (
                        <span className="text-muted-foreground/60">
                          {' · '}
                          {formatPhone(row.patient.phonePrimary)}
                        </span>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={cn(
                        'inline-flex max-w-[7.5rem] items-center gap-1 truncate rounded-full px-2 py-0.5 text-[11px] font-medium',
                        status.className,
                      )}
                    >
                      <span className={cn('size-1.5 shrink-0 rounded-full', status.dot)} aria-hidden />
                      <span className="truncate">{status.label}</span>
                    </span>
                    <Link
                      href={`/app/agenda?appointmentId=${row.id}`}
                      prefetch={false}
                      className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Abrir atendimento"
                    >
                      <MoreVerticalIcon className="size-3.5" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showPagination ? (
        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-2">
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {from}–{to} de {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              aria-label="Página anterior"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeftIcon className="size-3.5" />
            </button>
            <span className="min-w-10 text-center text-[11px] font-medium tabular-nums text-foreground">
              {page}/{totalPages}
            </span>
            <button
              type="button"
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              aria-label="Próxima página"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRightIcon className="size-3.5" />
            </button>
          </div>
        </footer>
      ) : null}
    </section>
  );
}
