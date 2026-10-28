'use client';

import { useDataSubjectRequestResolveFormHook } from '@/packages/admin/hooks/DataSubjectRequest/useDataSubjectRequestResolveFormHook';
import { useDataSubjectRequestUpdateHook } from '@/packages/admin/hooks/DataSubjectRequest/useDataSubjectRequestUpdateHook';
import type { DataSubjectRequestResolveFormValues } from '@/packages/admin/schemas/DataSubjectRequest/DataSubjectRequestSchema';
import type { DataSubjectRequestResolveFormDialogProps } from '@/packages/admin/types/DataSubjectRequest/DataSubjectRequestResolveFormDialogTypes';
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
import { Textarea } from '@/shared/ui/textarea';

export function DataSubjectRequestResolveFormDialog({
  request,
  status,
  onClose,
}: DataSubjectRequestResolveFormDialogProps) {
  const form = useDataSubjectRequestResolveFormHook();
  const update = useDataSubjectRequestUpdateHook();
  const title = status === 'COMPLETED' ? 'Concluir solicitação' : 'Rejeitar solicitação';

  const onSave = async (values: DataSubjectRequestResolveFormValues) => {
    await update.mutateAsync({
      id: request.id,
      dataSubjectRequestSchema: { status, resolution: values.resolution },
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              void form.handleSubmit(onSave)(e);
            }}
          >
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.resolution)}>
                <FieldLabel htmlFor="dsr-resolution">Resolução</FieldLabel>
                <Textarea id="dsr-resolution" rows={4} {...form.register('resolution')} />
                <FieldError>{form.formState.errors.resolution?.message}</FieldError>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? 'Salvando…' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </form>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
