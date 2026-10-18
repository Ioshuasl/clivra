'use client';

import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { ChevronRightIcon } from 'lucide-react';
import { cn } from '@/shared/helpers/utils';

export type DashboardMetric = {
  id: string;
  title: string;
  value: string;
  valueHint?: string;
  href: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  footer: ReactNode;
};

type DashboardMetricCardsProps = {
  metrics: DashboardMetric[];
};

export function DashboardMetricCards({ metrics }: DashboardMetricCardsProps) {
  return (
    <section
      className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
      data-testid="dashboard-kpi-grid"
    >
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Link
            key={metric.id}
            href={metric.href}
            prefetch={false}
            className={cn(
              'group flex min-h-0 min-w-0 flex-col gap-3 rounded-[12px] border border-border bg-card p-3.5',
              'transition-colors hover:border-primary/20 hover:bg-muted/30',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                  <Icon className="size-3.5" strokeWidth={1.6} />
                </span>
                <p className="text-[12px] leading-tight font-medium text-muted-foreground sm:truncate">
                  {metric.title}
                </p>
              </div>
              <ChevronRightIcon
                className="mt-0.5 size-3.5 shrink-0 text-border transition-colors group-hover:text-primary"
                strokeWidth={1.8}
              />
            </div>

            <div className="grid min-w-0 gap-1.5">
              <p className="truncate text-[22px] leading-none font-semibold tracking-tight text-foreground tabular-nums">
                {metric.valueHint ? (
                  <>
                    {metric.value}
                    <span className="ml-1 text-[12px] font-medium text-muted-foreground">
                      {metric.valueHint}
                    </span>
                  </>
                ) : (
                  metric.value
                )}
              </p>
              <div className="text-[12px] leading-snug text-muted-foreground">{metric.footer}</div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}

export function MetricDotFooter({
  color,
  children,
}: {
  color: 'green' | 'rose' | 'primary' | 'muted';
  children: ReactNode;
}) {
  const dot =
    color === 'green'
      ? 'bg-success'
      : color === 'rose'
        ? 'bg-destructive'
        : color === 'primary'
          ? 'bg-primary'
          : 'bg-border';

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-1.5 shrink-0 rounded-full', dot)} aria-hidden />
      <span>{children}</span>
    </span>
  );
}
