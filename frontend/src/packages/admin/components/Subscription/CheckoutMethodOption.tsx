import { CreditCardIcon, FileTextIcon, QrCodeIcon, type LucideIcon } from 'lucide-react';
import {
  BILLING_METHOD_HINTS,
  BILLING_METHOD_LABELS,
  type BillingMethod,
} from '@/packages/admin/enum/Subscription/BillingMethodEnum';
import { cn } from '@/shared/helpers/utils';
import { Badge } from '@/shared/ui/badge';
import { RadioGroupItem } from '@/shared/ui/radio-group';

const ICONS: Record<BillingMethod, LucideIcon> = {
  PIX: QrCodeIcon,
  CREDIT_CARD: CreditCardIcon,
  BOLETO: FileTextIcon,
};

type CheckoutMethodOptionProps = {
  method: BillingMethod;
  recommended?: boolean;
  disabled?: boolean;
};

/** Cartão de forma de pagamento (radio) com ícone, descrição curta e selo opcional. */
export function CheckoutMethodOption({ method, recommended, disabled }: CheckoutMethodOptionProps) {
  const Icon = ICONS[method];
  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col gap-2 rounded-xl border border-border bg-card px-3.5 py-3 transition-colors',
        'hover:border-ring/60 has-data-checked:border-primary has-data-checked:ring-2 has-data-checked:ring-primary/20',
        disabled && 'pointer-events-none opacity-60',
      )}
      data-testid={`method-option-${method}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        <RadioGroupItem
          value={method}
          aria-label={BILLING_METHOD_LABELS[method]}
          disabled={disabled}
        />
      </span>
      <span className="grid gap-0.5">
        <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-foreground">
          {BILLING_METHOD_LABELS[method]}
          {recommended ? <Badge variant="outline">Recomendado</Badge> : null}
        </span>
        <span className="text-xs text-muted-foreground">{BILLING_METHOD_HINTS[method]}</span>
      </span>
    </label>
  );
}
