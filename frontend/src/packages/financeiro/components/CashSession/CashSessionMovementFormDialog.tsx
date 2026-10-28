'use client';

import {
  CASH_MOVEMENT_KIND_LABELS,
  CASH_MOVEMENT_KINDS,
} from '@/packages/financeiro/enum/CashSession/CashMovementKindEnum';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
} from '@/packages/financeiro/enum/Payment/PaymentMethodEnum';
import { useCashSessionMovementCreateHook } from '@/packages/financeiro/hooks/CashSession/useCashSessionMovementCreateHook';
import { useCashSessionMovementFormHook } from '@/packages/financeiro/hooks/CashSession/useCashSessionMovementFormHook';
import {
  toCashMovementCreatePayload,
  type CashSessionMovementFormValues,
} from '@/packages/financeiro/schemas/CashSession/CashSessionMovementSchema';
import type { CashSessionMovementFormDialogProps } from '@/packages/financeiro/types/CashSession/CashSessionMovementFormDialogTypes';
import { MotionDialogBody } from '@/shared/motion/MotionDialogBody';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { Textarea } from '@/shared/ui/textarea';

export function CashSessionMovementFormDialog({
  sessionId,
  onClose,
}: CashSessionMovementFormDialogProps) {
  const form = useCashSessionMovementFormHook();
  const create = useCashSessionMovementCreateHook(sessionId);

  const onSave = async (values: CashSessionMovementFormValues) => {
    await create.mutateAsync(toCashMovementCreatePayload(values));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Sangria / suprimento</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              void form.handleSubmit(onSave)(event);
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="cash-move-kind">Tipo</FieldLabel>
                <NativeSelect
                  id="cash-move-kind"
                  value={form.watch('kind')}
                  onChange={(event) =>
                    form.setValue(
                      'kind',
                      event.target.value as CashSessionMovementFormValues['kind'],
                    )
                  }
                >
                  {CASH_MOVEMENT_KINDS.map((kind) => (
                    <NativeSelectOption key={kind} value={kind}>
                      {CASH_MOVEMENT_KIND_LABELS[kind]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="cash-move-method">Forma</FieldLabel>
                <NativeSelect
                  id="cash-move-method"
                  value={form.watch('method')}
                  onChange={(event) =>
                    form.setValue(
                      'method',
                      event.target.value as CashSessionMovementFormValues['method'],
                    )
                  }
                >
                  {PAYMENT_METHODS.map((method) => (
                    <NativeSelectOption key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.amountReais)}>
                <FieldLabel htmlFor="cash-move-amount">Valor (R$)</FieldLabel>
                <Input id="cash-move-amount" {...form.register('amountReais')} />
                <FieldError>{form.formState.errors.amountReais?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.reason)}>
                <FieldLabel htmlFor="cash-move-reason">Motivo</FieldLabel>
                <Textarea id="cash-move-reason" rows={3} {...form.register('reason')} />
                <FieldError>{form.formState.errors.reason?.message}</FieldError>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Registrando…' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </form>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
