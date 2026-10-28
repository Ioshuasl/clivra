'use client';

import { useEffect } from 'react';
import { useTreatmentExecuteFormHook } from '@/packages/clinico/hooks/TreatmentPlan/useTreatmentExecuteFormHook';
import { useTreatmentItemExecuteBatchHook } from '@/packages/clinico/hooks/TreatmentPlan/useTreatmentItemExecuteBatchHook';
import { useTreatmentItemExecuteHook } from '@/packages/clinico/hooks/TreatmentPlan/useTreatmentItemExecuteHook';
import type { TreatmentExecuteFormValues } from '@/packages/clinico/schemas/TreatmentPlan/TreatmentExecuteSchema';
import type { TreatmentExecuteFormDialogProps } from '@/packages/clinico/types/TreatmentPlan/TreatmentExecuteFormDialogTypes';
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
import { Field, FieldError, FieldLabel } from '@/shared/ui/field';
import { Textarea } from '@/shared/ui/textarea';

function defaultNote(items: TreatmentExecuteFormDialogProps['items']): string {
  const names = items.map((item) => {
    const tooth = item.toothCode ? ` dente ${item.toothCode}` : '';
    return `${item.procedureName}${tooth}.`;
  });
  return `${names.join(' ')} Evolução clínica registrada.`.trim();
}

export function TreatmentExecuteFormDialog({
  patientId,
  appointmentId,
  items,
  onClose,
  onExecuted,
}: TreatmentExecuteFormDialogProps) {
  const form = useTreatmentExecuteFormHook();
  const executeOne = useTreatmentItemExecuteHook(patientId);
  const executeMany = useTreatmentItemExecuteBatchHook(patientId);

  const handleForm = () => {
    form.reset({ note: defaultNote(items) });
  };

  useEffect(() => {
    handleForm();
  }, [items, form]);

  const pending = executeOne.isPending || executeMany.isPending;

  const onSave = async (values: TreatmentExecuteFormValues) => {
    if (items.length === 1 && items[0]) {
      await executeOne.mutateAsync({
        itemId: items[0].id,
        executeSchema: { note: values.note, appointmentId },
      });
    } else {
      await executeMany.mutateAsync({
        itemIds: items.map((item) => item.id),
        note: values.note,
        appointmentId,
      });
    }
    onExecuted();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Executar item</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              void form.handleSubmit(onSave)(event);
            }}
          >
            <Alert>
              <AlertTitle>Evolução assinada ao confirmar</AlertTitle>
              <AlertDescription>
                Esta evolução não pode ser editada; correções geram uma nova versão.
              </AlertDescription>
            </Alert>
            <Field data-invalid={Boolean(form.formState.errors.note)}>
              <FieldLabel htmlFor="treatment-execute-note">Texto da evolução</FieldLabel>
              <Textarea id="treatment-execute-note" rows={6} {...form.register('note')} />
              <FieldError>{form.formState.errors.note?.message}</FieldError>
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Assinando…' : 'Salvar e assinar'}
              </Button>
            </DialogFooter>
          </form>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
