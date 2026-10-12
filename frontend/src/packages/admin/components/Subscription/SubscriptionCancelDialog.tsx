'use client';

import { useState } from 'react';
import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import { useSubscriptionCancelHook } from '@/packages/admin/hooks/Subscription/useSubscriptionCancelHook';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';

type SubscriptionCancelDialogProps = {
  /** Durante o teste só a cobrança agendada é cancelada; a clínica segue normalmente. */
  scheduled?: boolean;
  onClose: () => void;
};

/** Cancelamento com confirmação explícita: remove cobranças em aberto e deixa a clínica só para leitura. */
export function SubscriptionCancelDialog({ scheduled = false, onClose }: SubscriptionCancelDialogProps) {
  const cancel = useSubscriptionCancelHook();
  const [reason, setReason] = useState('');

  const onConfirm = async () => {
    await cancel.mutateAsync({ reason });
    onClose();
  };

  return (
    <AlertDialog open onOpenChange={(open) => (!open && !cancel.isPending ? onClose() : undefined)}>
      <AlertDialogContent size="default" className="sm:max-w-md" data-testid="cancel-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {scheduled ? 'Cancelar a cobrança agendada?' : 'Cancelar assinatura?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {scheduled
              ? 'Nada será cobrado. Você continua no período de teste com acesso completo e pode assinar de novo quando quiser.'
              : 'As cobranças em aberto são removidas e a clínica passa a ser somente leitura. Seus dados continuam disponíveis para consulta e exportação por 90 dias.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-1.5">
          <label htmlFor="cancel-reason" className="text-xs font-medium text-muted-foreground">
            Quer nos contar o motivo? (opcional)
          </label>
          <Textarea
            id="cancel-reason"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>

        {cancel.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{adminErrorMessage(cancel.error)}</AlertDescription>
          </Alert>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer" disabled={cancel.isPending}>
            Manter assinatura
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            className="cursor-pointer"
            disabled={cancel.isPending}
            onClick={() => {
              void onConfirm();
            }}
            data-testid="cancel-confirm"
          >
            {cancel.isPending ? 'Cancelando…' : 'Cancelar assinatura'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
