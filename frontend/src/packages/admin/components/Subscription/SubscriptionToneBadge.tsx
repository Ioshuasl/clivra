import type { ReactNode } from 'react';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  MinusCircleIcon,
  type LucideIcon,
} from 'lucide-react';
import type { SubscriptionPaymentTone } from '@/packages/admin/enum/Subscription/SubscriptionPaymentStatusEnum';
import { cn } from '@/shared/helpers/utils';
import { Badge } from '@/shared/ui/badge';

const TONES: Record<SubscriptionPaymentTone, { className: string; Icon: LucideIcon }> = {
  success: { className: 'border-success/30 bg-success/10 text-success', Icon: CheckCircle2Icon },
  warning: { className: 'border-warning/40 bg-warning/10 text-warning', Icon: ClockIcon },
  danger: { className: 'border-destructive/30 bg-destructive/10 text-destructive', Icon: AlertTriangleIcon },
  neutral: { className: 'border-border bg-muted text-muted-foreground', Icon: MinusCircleIcon },
};

/** Selo de status: ícone + texto (o estado nunca depende só da cor). */
export function SubscriptionToneBadge({
  tone,
  children,
}: {
  tone: SubscriptionPaymentTone;
  children: ReactNode;
}) {
  const { className, Icon } = TONES[tone];
  return (
    <Badge variant="outline" className={cn('h-6 gap-1 px-2.5', className)}>
      <Icon aria-hidden />
      {children}
    </Badge>
  );
}
