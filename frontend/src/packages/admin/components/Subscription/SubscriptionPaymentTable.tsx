import { ReceiptTextIcon } from 'lucide-react';
import { SubscriptionToneBadge } from '@/packages/admin/components/Subscription/SubscriptionToneBadge';
import { BILLING_METHOD_LABELS, type BillingMethod } from '@/packages/admin/enum/Subscription/BillingMethodEnum';
import {
  isPaymentOpen,
  subscriptionPaymentView,
} from '@/packages/admin/enum/Subscription/SubscriptionPaymentStatusEnum';
import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import { formatCents } from '@/packages/admin/helpers/FormatCents';
import { formatDateBr } from '@/packages/admin/helpers/SubscriptionFormat';
import type { SubscriptionPayment } from '@/packages/admin/types/Subscription/SubscriptionCheckoutTypes';
import { ClivraSurface } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui/empty';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

type SubscriptionPaymentTableProps = {
  payments: SubscriptionPayment[] | undefined;
  isLoading: boolean;
  error: unknown;
  /** Pagar só faz sentido quando o pagamento online está ligado. */
  canPay: boolean;
  onPay: (paymentId: string) => void;
};

export function SubscriptionPaymentTable({
  payments,
  isLoading,
  error,
  canPay,
  onPay,
}: SubscriptionPaymentTableProps) {
  return (
    <ClivraSurface
      toolbar={
        <div>
          <h2 className="text-sm font-semibold text-foreground">Faturas</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Histórico de cobranças da assinatura.</p>
        </div>
      }
    >
      {isLoading ? (
        <div className="grid gap-2 px-4 py-4">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      ) : error ? (
        <div className="px-4 py-4">
          <Alert variant="destructive">
            <AlertDescription>{adminErrorMessage(error)}</AlertDescription>
          </Alert>
        </div>
      ) : !payments || payments.length === 0 ? (
        <Empty className="py-10" data-testid="payments-empty">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ReceiptTextIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhuma fatura ainda</EmptyTitle>
            <EmptyDescription>As faturas aparecem aqui depois que você assina um plano.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table data-testid="payments-table">
          <TableHeader>
            <TableRow>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => {
              const view = subscriptionPaymentView(payment.status);
              const open = isPaymentOpen(payment.status);
              const method = payment.billingType as BillingMethod | null;
              return (
                <TableRow key={payment.id} data-testid={`payment-row-${payment.status}`}>
                  <TableCell className="tabular-nums">{formatDateBr(payment.dueDate)}</TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {formatCents(payment.valueCents)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {method ? (BILLING_METHOD_LABELS[method] ?? method) : '—'}
                  </TableCell>
                  <TableCell>
                    <SubscriptionToneBadge tone={view.tone}>{view.label}</SubscriptionToneBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {open && canPay && payment.billingType !== 'CREDIT_CARD' ? (
                        <Button
                          type="button"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => onPay(payment.id)}
                        >
                          Pagar
                        </Button>
                      ) : null}
                      {payment.invoiceUrl ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          nativeButton={false}
                          render={<a href={payment.invoiceUrl} target="_blank" rel="noreferrer" />}
                        >
                          Ver fatura
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </ClivraSurface>
  );
}
