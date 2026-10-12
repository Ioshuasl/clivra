'use client';

import { PaymentBoletoPanel } from '@/packages/admin/components/Subscription/PaymentBoletoPanel';
import { PaymentPixPanel } from '@/packages/admin/components/Subscription/PaymentPixPanel';
import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import { useSubscriptionPaymentPayGetHook } from '@/packages/admin/hooks/Subscription/useSubscriptionPaymentPayGetHook';
import type { SubscriptionPayment } from '@/packages/admin/types/Subscription/SubscriptionCheckoutTypes';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Skeleton } from '@/shared/ui/skeleton';

type SubscriptionPaymentPayDialogProps = {
  payment: SubscriptionPayment;
  onClose: () => void;
};

/** Pagar uma fatura em aberto sem sair da tela (Pix atualizado ou boleto). */
export function SubscriptionPaymentPayDialog({ payment, onClose }: SubscriptionPaymentPayDialogProps) {
  const pay = useSubscriptionPaymentPayGetHook(payment.id);
  const data = pay.data;

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-xl" data-testid="payment-pay-dialog">
        <DialogHeader>
          <DialogTitle>Pagar fatura</DialogTitle>
          <DialogDescription>
            Assim que o pagamento for confirmado, esta janela fecha e a assinatura é atualizada.
          </DialogDescription>
        </DialogHeader>

        {pay.isLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-10" />
          </div>
        ) : pay.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{adminErrorMessage(pay.error)}</AlertDescription>
          </Alert>
        ) : data?.pix ? (
          <PaymentPixPanel
            pix={data.pix}
            valueCents={payment.valueCents}
            dueDate={payment.dueDate}
            waiting
          />
        ) : data?.boleto ? (
          <PaymentBoletoPanel
            boleto={data.boleto}
            valueCents={payment.valueCents}
            dueDate={payment.dueDate}
            waiting
          />
        ) : (
          <Alert>
            <AlertDescription>
              Esta fatura é paga em página do Asaas. Use o botão &quot;Ver fatura&quot; para abrir.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" className="cursor-pointer" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
