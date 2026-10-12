import { USAGE_METRIC_LABELS, type UsageMetric } from '@/packages/admin/enum/Subscription/UsageMetricEnum';
import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import { formatBytes } from '@/packages/admin/helpers/FormatCents';
import type { UsageSummary } from '@/packages/admin/types/Subscription/SubscriptionTypes';
import { ClivraSurface } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Progress } from '@/shared/ui/progress';
import { Skeleton } from '@/shared/ui/skeleton';

type SubscriptionUsageCardProps = {
  usage: UsageSummary | undefined;
  isLoading: boolean;
  error: unknown;
};

function formatValue(metric: string, value: number): string {
  return metric === 'storage_bytes' ? formatBytes(value) : String(value);
}

export function SubscriptionUsageCard({ usage, isLoading, error }: SubscriptionUsageCardProps) {
  return (
    <ClivraSurface
      toolbar={<h2 className="text-sm font-semibold text-foreground">Uso atual</h2>}
      contentClassName="px-4 py-4"
    >
      {isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{adminErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : (
        <ul className="grid gap-3">
          {(usage?.items ?? []).map((item) => {
            const label = USAGE_METRIC_LABELS[item.metric as UsageMetric] ?? item.metric;
            const pct =
              item.limit && item.limit > 0 ? Math.min(100, (item.current / item.limit) * 100) : null;
            return (
              <li key={item.metric} className="grid gap-1.5 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-foreground">{label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatValue(item.metric, item.current)} /{' '}
                    {item.limit == null ? 'ilimitado' : formatValue(item.metric, item.limit)}
                  </span>
                </div>
                {pct != null ? <Progress value={pct} aria-label={`Uso de ${label}`} /> : null}
              </li>
            );
          })}
        </ul>
      )}
    </ClivraSurface>
  );
}
