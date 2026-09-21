'use client';

import Link from 'next/link';
import type { ComponentType } from 'react';
import {
  ArrowUpRightIcon,
  BarChart3Icon,
  CalendarXIcon,
  ChevronRightIcon,
  CircleDollarSignIcon,
  ClipboardListIcon,
  WalletIcon,
} from 'lucide-react';
import {
  DashboardMetricCards,
  MetricDotFooter,
  type DashboardMetric,
} from '@/packages/admin/components/Dashboard/DashboardMetricCards';
import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import { formatCents } from '@/packages/admin/helpers/FormatCents';
import { monthRangeIso } from '@/packages/admin/helpers/ReportPeriod';
import { useDashboardGetHook } from '@/packages/admin/hooks/Report/useDashboardGetHook';
import { useRevenueGetHook } from '@/packages/admin/hooks/Report/useRevenueGetHook';
import { useAuth } from '@/shared/auth/AuthProvider';
import { hasPermission } from '@/shared/auth/permissions';
import { ClivraPageHeader, ClivraSurface } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { cn } from '@/shared/helpers/utils';

type ReportCatalogItem = {
  id: string;
  href: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  permission: 'reports.read' | 'reports.financial';
  group: 'clinica' | 'financeiro';
  externalLabel?: string;
};

const CATALOG: ReportCatalogItem[] = [
  {
    id: 'procedures',
    href: '/app/relatorios/producao',
    title: 'Procedimentos',
    description: 'Mix de serviços realizados no período.',
    icon: ClipboardListIcon,
    permission: 'reports.read',
    group: 'clinica',
  },
  {
    id: 'revenue',
    href: '/app/relatorios/receita',
    title: 'Receita',
    description: 'Pagamentos recebidos, por dia, mês ou profissional.',
    icon: CircleDollarSignIcon,
    permission: 'reports.financial',
    group: 'financeiro',
  },
  {
    id: 'no-shows',
    href: '/app/relatorios/faltas',
    title: 'Faltas',
    description: 'No-shows, cancelamentos e perda estimada.',
    icon: CalendarXIcon,
    permission: 'reports.financial',
    group: 'financeiro',
  },
  {
    id: 'overdue',
    href: '/app/relatorios/overdue',
    title: 'Inadimplência',
    description: 'Parcelas vencidas por faixa de atraso.',
    icon: WalletIcon,
    permission: 'reports.financial',
    group: 'financeiro',
  },
  {
    id: 'cash-flow',
    href: '/app/financeiro/relatorios',
    title: 'Fluxo de caixa',
    description: 'Entradas, saídas e saldo do período.',
    icon: BarChart3Icon,
    permission: 'reports.financial',
    group: 'financeiro',
    externalLabel: 'Mesmo relatório do Financeiro',
  },
  {
    id: 'production',
    href: '/app/financeiro/relatorios',
    title: 'Produção por profissional',
    description: 'Valor executado por dentista no período.',
    icon: BarChart3Icon,
    permission: 'reports.read',
    group: 'clinica',
    externalLabel: 'Mesmo relatório do Financeiro',
  },
];

export function ReportIndex() {
  const { me } = useAuth();
  const canRead = hasPermission(me, 'reports.read');
  const canFinancial = hasPermission(me, 'reports.financial');
  const isDentist = me?.current.role === 'DENTIST';
  const month = monthRangeIso();

  const dashboard = useDashboardGetHook({}, canRead);
  const revenue = useRevenueGetHook(
    { from: month.from, to: month.to, groupBy: 'month' },
    canFinancial,
  );

  if (!canRead) {
    return (
      <div className="grid min-w-0 gap-4">
        <ClivraPageHeader title="Relatórios" description="Indicadores e exportações da clínica." />
        <Alert variant="destructive">
          <AlertDescription>Você não tem permissão para ver relatórios.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const items = CATALOG.filter((item) => hasPermission(me, item.permission));
  const clinica = items.filter((item) => item.group === 'clinica');
  const financeiro = items.filter((item) => item.group === 'financeiro');

  const metrics: DashboardMetric[] = [];
  const data = dashboard.data;

  if (canFinancial) {
    metrics.push({
      id: 'recebido',
      title: 'Recebido no mês',
      value: formatCents(revenue.data?.totalCents ?? 0),
      href: '/app/relatorios/receita',
      icon: CircleDollarSignIcon,
      footer: (
        <MetricDotFooter color="green">
          {revenue.isLoading ? 'carregando…' : 'pagamentos do mês'}
        </MetricDotFooter>
      ),
    });
    metrics.push({
      id: 'atraso',
      title: 'Em atraso',
      value: '—',
      href: '/app/relatorios/overdue',
      icon: WalletIcon,
      footer: <MetricDotFooter color="rose">abrir relatório</MetricDotFooter>,
    });
  }

  if (canFinancial) {
    metrics.push({
      id: 'faltas',
      title: 'Faltas no mês',
      value: String(data?.noShowsMonthCount ?? 0),
      href: data?.drillDown.noShows ?? '/app/relatorios/faltas',
      icon: CalendarXIcon,
      footer: <MetricDotFooter color="rose">no-shows registrados</MetricDotFooter>,
    });
  }

  metrics.push({
    id: 'producao',
    title: isDentist ? 'Sua produção no mês' : 'Produção do mês',
    value: formatCents(data?.productionMonthCents ?? 0),
    href: data?.drillDown.production ?? '/app/financeiro/relatorios',
    icon: BarChart3Icon,
    footer: (
      <MetricDotFooter color="primary">
        {isDentist ? 'sua produção' : 'executado na clínica'}
      </MetricDotFooter>
    ),
  });

  return (
    <div className="grid min-w-0 gap-4">
      <ClivraPageHeader
        title="Relatórios"
        description={
          isDentist
            ? 'Sua produção e procedimentos — números claros para o dia a dia.'
            : 'Números da clínica para decidir — e exportar quando precisar.'
        }
      />

      {dashboard.isError || revenue.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {adminErrorMessage(dashboard.error ?? revenue.error)}
          </AlertDescription>
        </Alert>
      ) : null}

      {metrics.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Atalhos do mês
          </p>
          {dashboard.isLoading || (canFinancial && revenue.isLoading) ? (
            <p className="text-sm text-muted-foreground">Carregando indicadores…</p>
          ) : (
            <DashboardMetricCards metrics={metrics} />
          )}
        </div>
      ) : null}

      {clinica.length > 0 ? (
        <CatalogGroup
          title={isDentist ? 'Seus relatórios' : 'Clínica'}
          description="Produção e mix de procedimentos."
          items={clinica}
        />
      ) : null}

      {financeiro.length > 0 ? (
        <CatalogGroup
          title="Financeiro"
          description="Receita, faltas, inadimplência e fluxo."
          items={financeiro}
        />
      ) : null}
    </div>
  );
}

function CatalogGroup({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: ReportCatalogItem[];
}) {
  return (
    <ClivraSurface
      toolbar={
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      }
      contentClassName="p-0"
    >
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  'group flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors',
                  'hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none',
                )}
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                  <Icon className="size-4" strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    {item.externalLabel ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <ArrowUpRightIcon className="size-3" strokeWidth={1.8} />
                        {item.externalLabel}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRightIcon
                  className="mt-1 size-4 shrink-0 text-border transition-colors group-hover:text-primary"
                  strokeWidth={1.8}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </ClivraSurface>
  );
}
