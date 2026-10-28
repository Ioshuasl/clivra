'use client';

import { useState } from 'react';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import { useDocumentCancelFormHook } from '@/packages/operacional/hooks/Document/useDocumentCancelFormHook';
import { useDocumentCancelHook } from '@/packages/operacional/hooks/Document/useDocumentCancelHook';
import type { DocumentCancelFormValues } from '@/packages/operacional/schemas/Document/DocumentIssueSchema';
import type { DocumentCancelFormDialogProps } from '@/packages/operacional/types/Document/DocumentFormDialogTypes';
import { useSheetOpenState } from '@/shared/motion/useSheetOpenState';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import { Textarea } from '@/shared/ui/textarea';

export function DocumentCancelFormDialog({
  patientId,
  documentId,
  documentTitle,
  onClose,
}: DocumentCancelFormDialogProps) {
  const form = useDocumentCancelFormHook();
  const cancel = useDocumentCancelHook(patientId);
  const [serverError, setServerError] = useState<string | null>(null);
  const { sheetOpen, requestClose, onOpenChange, onOpenChangeComplete } = useSheetOpenState(
    true,
    onClose,
  );

  const onSave = async (values: DocumentCancelFormValues) => {
    setServerError(null);
    try {
      await cancel.mutateAsync({ documentId, reason: values.reason });
      requestClose();
    } catch (error) {
      setServerError(operacionalErrorMessage(error));
    }
  };

  return (
    <Sheet open={sheetOpen} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>Cancelar documento</SheetTitle>
          <SheetDescription>
            “{documentTitle}” continua guardado na ficha, marcado como cancelado. Não dá para desfazer.
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            void form.handleSubmit(onSave)(event);
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="document-cancel-reason">Por que está cancelando?</FieldLabel>
                <Textarea
                  id="document-cancel-reason"
                  rows={4}
                  aria-invalid={Boolean(form.formState.errors.reason)}
                  {...form.register('reason')}
                />
                <FieldDescription>Fica registrado para consulta futura.</FieldDescription>
                <FieldError errors={[form.formState.errors.reason]} />
              </Field>
              {serverError ? (
                <Alert variant="destructive">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              ) : null}
            </FieldGroup>
          </div>

          <SheetFooter className="border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="cursor-pointer" onClick={requestClose}>
              Voltar
            </Button>
            <Button type="submit" variant="destructive" className="cursor-pointer" disabled={cancel.isPending}>
              {cancel.isPending ? 'Cancelando…' : 'Cancelar documento'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
