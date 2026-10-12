import { ExternalLinkIcon } from 'lucide-react';
import { CheckoutCopyField } from '@/packages/admin/components/Subscription/CheckoutCopyField';
import { CheckoutWaitingStatus } from '@/packages/admin/components/Subscription/CheckoutWaitingStatus';
import { formatCents } from '@/packages/admin/helpers/FormatCents';
import { formatDateBr } from '@/packages/admin/helpers/SubscriptionFormat';
import type { BoletoPayView } from '@/packages/admin/types/Subscription/SubscriptionCheckoutTypes';
import { Button } from '@/shared/ui/button';

type PaymentBoletoPanelProps = {
  boleto: BoletoPayView;
  valueCents: number;
  dueDate: string;
  waiting?: boolean;
};

/** Pagamento por boleto: linha digitável para copiar + link do PDF. */
export function PaymentBoletoPanel({
  boleto,
  valueCents,
  dueDate,
  waiting = false,
}: PaymentBoletoPanelProps) {
  return (
    <div className="grid gap-4" data-testid="payment-boleto-panel">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Valor</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {formatCents(valueCents)}
          </p>
          <p className="text-xs text-muted-foreground">Vencimento em {formatDateBr(dueDate)}</p>
        </div>
        {boleto.url ? (
          <Button
            variant="outline"
            className="cursor-pointer"
            nativeButton={false}
            render={<a href={boleto.url} target="_blank" rel="noreferrer" />}
          >
            <ExternalLinkIcon data-icon="inline-start" />
            Abrir boleto
          </Button>
        ) : null}
      </div>
      {boleto.digitableLine ? (
        <CheckoutCopyField
          label="Linha digitável"
          value={boleto.digitableLine}
          buttonLabel="Copiar linha"
          testId="payment-boleto-line"
        />
      ) : null}
      <p className="text-sm text-muted-foreground">
        O banco leva de 1 a 2 dias úteis para confirmar. Quando confirmar, a assinatura ativa
        sozinha e avisamos por e-mail.
      </p>
      {waiting ? <CheckoutWaitingStatus /> : null}
    </div>
  );
}
