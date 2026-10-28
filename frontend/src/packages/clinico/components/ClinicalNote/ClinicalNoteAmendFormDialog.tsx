'use client';

import { useEffect } from 'react';
import { useClinicalNoteAmendFormHook } from '@/packages/clinico/hooks/ClinicalNote/useClinicalNoteAmendFormHook';
import { useClinicalNoteAmendHook } from '@/packages/clinico/hooks/ClinicalNote/useClinicalNoteAmendHook';
import type { ClinicalNoteAmendFormValues } from '@/packages/clinico/schemas/ClinicalNote/ClinicalNoteSchema';
import type { ClinicalNoteAmendFormDialogProps } from '@/packages/clinico/types/ClinicalNote/ClinicalNoteAmendFormDialogTypes';
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

export function ClinicalNoteAmendFormDialog({
  patientId,
  note,
  onClose,
}: ClinicalNoteAmendFormDialogProps) {
  const form = useClinicalNoteAmendFormHook(note.content);
  const amend = useClinicalNoteAmendHook(patientId);

  useEffect(() => {
    form.reset({ content: note.content, reason: '' });
  }, [note.id, note.content, form]);

  const onSave = async (values: ClinicalNoteAmendFormValues) => {
    await amend.mutateAsync({
      patientId,
      noteId: note.id,
      noteSchema: values,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Corrigir evolução</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              void form.handleSubmit(onSave)(event);
            }}
          >
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.content)}>
                <FieldLabel htmlFor="amend-content">Novo texto</FieldLabel>
                <Textarea id="amend-content" rows={6} {...form.register('content')} />
                <FieldError>{form.formState.errors.content?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.reason)}>
                <FieldLabel htmlFor="amend-reason">Motivo</FieldLabel>
                <Textarea id="amend-reason" rows={3} {...form.register('reason')} />
                <FieldError>{form.formState.errors.reason?.message}</FieldError>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={amend.isPending}>
                {amend.isPending ? 'Salvando…' : 'Gerar nova versão'}
              </Button>
            </DialogFooter>
          </form>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
