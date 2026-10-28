'use client';

import { useRef } from 'react';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
} from '@/packages/financeiro/enum/Payment/PaymentMethodEnum';
import { formatCents } from '@/packages/financeiro/helpers/FormatCents';
import { usePayablePayFormHook } from '@/packages/financeiro/hooks/Payable/usePayablePayFormHook';
import { usePayablePayHook } from '@/packages/financeiro/hooks/Payable/usePayablePayHook';
import {
  toPayablePayPayload,
  type PayablePayFormValues,
} from '@/packages/financeiro/schemas/Payable/PayablePaySchema';
import type { PayablePayFormDialogProps } from '@/packages/financeiro/types/Payable/PayableFormDialogTypes';
import { MotionDialogBody } from '@/shared/motion/MotionDialogBody';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';

export function PayablePayFormDialog({ payable, onClose }: PayablePayFormDialogProps) {
  const form = usePayablePayFormHook();
  const pay = usePayablePayHook(payable.id);
  const idempotencyKey = useRef(crypto.randomUUID());

  const onSave = async (values: PayablePayFormValues) => {
    await pay.mutateAsync({
      payablePaySchema: toPayablePayPayload(values),
      idempotencyKey: idempotencyKey.current,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Pagar conta</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              void form.handleSubmit(onSave)(event);
            }}
          >
            <p className="text-sm">
              {payable.description} · {formatCents(payable.amountCents)}
            </p>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="payable-pay-method">Forma</FieldLabel>
                <NativeSelect
                  id="payable-pay-method"
                  value={form.watch('method')}
                  onChange={(event) =>
                    form.setValue('method', event.target.value as PayablePayFormValues['method'])
                  }
                >
                  {PAYMENT_METHODS.map((method) => (
                    <NativeSelectOption key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pay.isPending}>
                {pay.isPending ? 'Pagando…' : 'Confirmar pagamento'}
              </Button>
            </DialogFooter>
          </form>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
