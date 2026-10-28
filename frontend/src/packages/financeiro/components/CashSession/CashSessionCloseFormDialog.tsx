'use client';

import { useMemo, useRef } from 'react';
import { useFieldArray } from 'react-hook-form';
import { PAYMENT_METHOD_LABELS } from '@/packages/financeiro/enum/Payment/PaymentMethodEnum';
import { centsToReaisInput, formatCents } from '@/packages/financeiro/helpers/FormatCents';
import { useCashSessionCloseFormHook } from '@/packages/financeiro/hooks/CashSession/useCashSessionCloseFormHook';
import { useCashSessionCloseHook } from '@/packages/financeiro/hooks/CashSession/useCashSessionCloseHook';
import {
  closeDifferenceCents,
  toCashSessionClosePayload,
  type CashSessionCloseFormValues,
} from '@/packages/financeiro/schemas/CashSession/CashSessionCloseSchema';
import type { CashSessionCloseFormDialogProps } from '@/packages/financeiro/types/CashSession/CashSessionCloseFormDialogTypes';
import { MotionDialogBody } from '@/shared/motion/MotionDialogBody';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
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
import { Textarea } from '@/shared/ui/textarea';

export function CashSessionCloseFormDialog({ session, onClose }: CashSessionCloseFormDialogProps) {
  const defaults = useMemo(
    () => ({
      countedByMethod: session.expectedByMethod.map((row) => ({
        method: row.method,
        countedReais: centsToReaisInput(row.expectedCents),
      })),
      differenceReason: '',
    }),
    [session.expectedByMethod],
  );
  const form = useCashSessionCloseFormHook(defaults);
  const { fields } = useFieldArray({ control: form.control, name: 'countedByMethod' });
  const close = useCashSessionCloseHook(session.id);
  const idempotencyKey = useRef(crypto.randomUUID());

  const watched = form.watch('countedByMethod');
  const diff = closeDifferenceCents(
    session.expectedByMethod,
    watched.map((row) => ({
      method: row.method,
      countedCents: Math.round(
        (Number(String(row.countedReais).replace(/\s/g, '').replace(',', '.')) || 0) * 100,
      ),
    })),
  );
  const needsReason = diff !== 0;

  const onSave = async (values: CashSessionCloseFormValues) => {
    const payload = toCashSessionClosePayload(values);
    const payloadDiff = closeDifferenceCents(session.expectedByMethod, payload.countedByMethod);
    if (payloadDiff !== 0 && (!values.differenceReason || values.differenceReason.trim().length < 10)) {
      form.setError('differenceReason', {
        message: 'Diferença exige justificativa com ao menos 10 caracteres.',
      });
      return;
    }
    await close.mutateAsync({
      cashSessionCloseSchema: payload,
      idempotencyKey: idempotencyKey.current,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Fechar caixa</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              void form.handleSubmit(onSave)(event);
            }}
          >
            <FieldGroup>
              {fields.map((field, index) => {
                const method = form.watch(`countedByMethod.${index}.method`);
                const expected =
                  session.expectedByMethod.find((row) => row.method === method)?.expectedCents ?? 0;
                return (
                  <Field key={field.id}>
                    <FieldLabel htmlFor={`cash-count-${index}`}>
                      {PAYMENT_METHOD_LABELS[method]} (esperado {formatCents(expected)})
                    </FieldLabel>
                    <Input
                      id={`cash-count-${index}`}
                      {...form.register(`countedByMethod.${index}.countedReais`)}
                    />
                  </Field>
                );
              })}
            </FieldGroup>

            {needsReason ? (
              <Alert>
                <AlertTitle>Divergência de {formatCents(Math.abs(diff))}</AlertTitle>
                <AlertDescription>
                  Contagem diferente do esperado. Informe o motivo (não depende só da cor).
                </AlertDescription>
              </Alert>
            ) : null}

            <Field data-invalid={Boolean(form.formState.errors.differenceReason)}>
              <FieldLabel htmlFor="cash-diff-reason">Justificativa da diferença</FieldLabel>
              <Textarea id="cash-diff-reason" rows={3} {...form.register('differenceReason')} />
              <FieldError>{form.formState.errors.differenceReason?.message}</FieldError>
            </Field>


            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={close.isPending}>
                {close.isPending ? 'Fechando…' : 'Fechar caixa'}
              </Button>
            </DialogFooter>
          </form>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
