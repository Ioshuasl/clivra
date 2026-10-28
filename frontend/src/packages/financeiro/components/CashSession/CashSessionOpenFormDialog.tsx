'use client';

import { useRef } from 'react';
import { useCashSessionCreateHook } from '@/packages/financeiro/hooks/CashSession/useCashSessionCreateHook';
import { useCashSessionOpenFormHook } from '@/packages/financeiro/hooks/CashSession/useCashSessionOpenFormHook';
import {
  toCashSessionCreatePayload,
  type CashSessionOpenFormValues,
} from '@/packages/financeiro/schemas/CashSession/CashSessionOpenSchema';
import type { CashSessionOpenFormDialogProps } from '@/packages/financeiro/types/CashSession/CashSessionOpenFormDialogTypes';
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

export function CashSessionOpenFormDialog({
  unitId,
  unitName,
  onClose,
}: CashSessionOpenFormDialogProps) {
  const form = useCashSessionOpenFormHook();
  const create = useCashSessionCreateHook();
  const idempotencyKey = useRef(crypto.randomUUID());

  const onSave = async (values: CashSessionOpenFormValues) => {
    await create.mutateAsync({
      cashSessionCreateSchema: toCashSessionCreatePayload(unitId, values),
      idempotencyKey: idempotencyKey.current,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Abrir caixa</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              void form.handleSubmit(onSave)(event);
            }}
          >
            <p className="text-sm text-muted-foreground">Unidade: {unitName}</p>
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.openingReais)}>
                <FieldLabel htmlFor="cash-opening">Fundo inicial (R$)</FieldLabel>
                <Input id="cash-opening" {...form.register('openingReais')} />
                <FieldError>{form.formState.errors.openingReais?.message}</FieldError>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Abrindo…' : 'Abrir'}
              </Button>
            </DialogFooter>
          </form>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
