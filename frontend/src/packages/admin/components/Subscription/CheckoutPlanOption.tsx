import { CheckIcon } from 'lucide-react';
import { formatPlanPrice, planFeatureLines } from '@/packages/admin/helpers/SubscriptionFormat';
import type { PlanSummary } from '@/packages/admin/types/Subscription/SubscriptionTypes';
import { cn } from '@/shared/helpers/utils';
import { Badge } from '@/shared/ui/badge';
import { RadioGroupItem } from '@/shared/ui/radio-group';

type CheckoutPlanOptionProps = {
  plan: PlanSummary;
  highlighted: boolean;
  current: boolean;
  disabled?: boolean;
};

/** Cartão de plano selecionável (padrão de tabela de preços com 3 colunas). */
export function CheckoutPlanOption({ plan, highlighted, current, disabled }: CheckoutPlanOptionProps) {
  return (
    <label
      className={cn(
        'relative flex cursor-pointer flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-colors',
        'hover:border-ring/60 has-data-checked:border-primary has-data-checked:ring-2 has-data-checked:ring-primary/20',
        disabled && 'pointer-events-none opacity-60',
      )}
      data-testid={`plan-option-${plan.code}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="grid gap-1.5">
          <span className="text-sm font-semibold text-foreground">{plan.name}</span>
          {highlighted ? <Badge className="w-fit">Mais escolhido</Badge> : null}
          {current && !highlighted ? (
            <Badge variant="outline" className="w-fit">
              Plano atual
            </Badge>
          ) : null}
        </div>
        <RadioGroupItem value={plan.code} aria-label={`Plano ${plan.name}`} disabled={disabled} />
      </div>
      <p className="flex items-baseline gap-1">
        <span className="text-3xl font-semibold tabular-nums text-foreground">
          {formatPlanPrice(plan.priceCents)}
        </span>
        <span className="text-sm text-muted-foreground">/mês</span>
      </p>
      <ul className="grid gap-1.5 text-sm text-muted-foreground">
        {planFeatureLines(plan).map((line) => (
          <li key={line} className="flex items-start gap-2">
            <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </label>
  );
}
