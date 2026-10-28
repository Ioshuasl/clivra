'use client';

import { useAttachmentDeleteFormHook } from '@/packages/clinico/hooks/Attachment/useAttachmentDeleteFormHook';
import { useAttachmentDeleteHook } from '@/packages/clinico/hooks/Attachment/useAttachmentDeleteHook';
import type { AttachmentDeleteFormValues } from '@/packages/clinico/schemas/Attachment/AttachmentSchema';
import type { AttachmentDeleteFormDialogProps } from '@/packages/clinico/types/Attachment/AttachmentDeleteFormDialogTypes';
import { MotionDialogBody } from '@/shared/motion/MotionDialogBody';
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

export function AttachmentDeleteFormDialog({
  attachment,
  onClose,
}: AttachmentDeleteFormDialogProps) {
  const form = useAttachmentDeleteFormHook();
  const remove = useAttachmentDeleteHook(attachment.patientId);

  const onSave = async (values: AttachmentDeleteFormValues) => {
    await remove.mutateAsync({
      attachmentId: attachment.id,
      attachmentSchema: values,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Excluir anexo</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              void form.handleSubmit(onSave)(event);
            }}
          >
            <p className="text-sm text-muted-foreground">{attachment.fileName}</p>
            <Field data-invalid={Boolean(form.formState.errors.reason)}>
              <FieldLabel htmlFor="attachment-delete-reason">Motivo</FieldLabel>
              <Textarea id="attachment-delete-reason" rows={3} {...form.register('reason')} />
              <FieldError>{form.formState.errors.reason?.message}</FieldError>
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={remove.isPending}>
                {remove.isPending ? 'Excluindo…' : 'Excluir'}
              </Button>
            </DialogFooter>
          </form>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
