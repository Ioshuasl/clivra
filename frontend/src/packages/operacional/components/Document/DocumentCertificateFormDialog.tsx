'use client';

import { useState } from 'react';
import { fileToBase64 } from '@/packages/operacional/helpers/FileToBase64';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import { useCertificateFormHook } from '@/packages/operacional/hooks/Document/useCertificateFormHook';
import { useCertificateUpdateHook } from '@/packages/operacional/hooks/Document/useCertificateUpdateHook';
import type { CertificateFormValues } from '@/packages/operacional/schemas/Document/DocumentCertificateSchema';
import type { DocumentCertificateFormDialogProps } from '@/packages/operacional/types/Document/DocumentFormDialogTypes';
import { useSheetOpenState } from '@/shared/motion/useSheetOpenState';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';

export function DocumentCertificateFormDialog({ replacing, onClose }: DocumentCertificateFormDialogProps) {
  const form = useCertificateFormHook();
  const update = useCertificateUpdateHook();
  const [serverError, setServerError] = useState<string | null>(null);
  const { sheetOpen, requestClose, onOpenChange, onOpenChangeComplete } = useSheetOpenState(
    true,
    onClose,
  );

  const onSave = async (values: CertificateFormValues) => {
    setServerError(null);
    try {
      const pfxBase64 = await fileToBase64(values.file);
      await update.mutateAsync({ pfxBase64, password: values.password });
      requestClose();
    } catch (error) {
      setServerError(operacionalErrorMessage(error));
    }
  };

  const fileName = form.watch('file')?.name;

  return (
    <Sheet open={sheetOpen} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>{replacing ? 'Trocar certificado digital' : 'Enviar certificado digital'}</SheetTitle>
          <SheetDescription>
            Escolha o arquivo do seu certificado A1 (termina em .pfx ou .p12) e digite a senha dele.
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
                <FieldLabel htmlFor="certificate-file">Arquivo do certificado</FieldLabel>
                <Input
                  id="certificate-file"
                  type="file"
                  accept=".pfx,.p12,application/x-pkcs12"
                  aria-invalid={Boolean(form.formState.errors.file)}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) form.setValue('file', file, { shouldValidate: true });
                  }}
                />
                {fileName ? <FieldDescription>Arquivo escolhido: {fileName}</FieldDescription> : null}
                <FieldError errors={[form.formState.errors.file]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="certificate-password">Senha do certificado</FieldLabel>
                <Input
                  id="certificate-password"
                  type="password"
                  autoComplete="off"
                  aria-invalid={Boolean(form.formState.errors.password)}
                  {...form.register('password')}
                />
                <FieldDescription>
                  A senha serve só para conferir o arquivo agora. Ela não fica guardada: você vai digitá-la a
                  cada assinatura.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.password]} />
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
              Cancelar
            </Button>
            <Button type="submit" className="cursor-pointer" disabled={update.isPending}>
              {update.isPending ? 'Conferindo…' : 'Guardar certificado'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
