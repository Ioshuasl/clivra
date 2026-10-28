'use client';

import { useState } from 'react';
import Link from 'next/link';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import { useCertificateGetHook } from '@/packages/operacional/hooks/Document/useCertificateGetHook';
import { useDocumentSignFormHook } from '@/packages/operacional/hooks/Document/useDocumentSignFormHook';
import { useDocumentSignHook } from '@/packages/operacional/hooks/Document/useDocumentSignHook';
import type { DocumentSignFormValues } from '@/packages/operacional/schemas/Document/DocumentCertificateSchema';
import type { DocumentSignFormDialogProps } from '@/packages/operacional/types/Document/DocumentFormDialogTypes';
import { useSheetOpenState } from '@/shared/motion/useSheetOpenState';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button, buttonVariants } from '@/shared/ui/button';
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

export function DocumentSignFormDialog({
  patientId,
  documentId,
  documentTitle,
  onClose,
  onSigned,
}: DocumentSignFormDialogProps) {
  const certificate = useCertificateGetHook();
  const form = useDocumentSignFormHook();
  const sign = useDocumentSignHook(patientId);
  const [serverError, setServerError] = useState<string | null>(null);
  const { sheetOpen, requestClose, onOpenChange, onOpenChangeComplete } = useSheetOpenState(
    true,
    onClose,
  );

  const info = certificate.data?.certificate;
  const missing = certificate.isSuccess && !info;
  const expired = Boolean(info?.expired);

  const onSave = async (values: DocumentSignFormValues) => {
    setServerError(null);
    try {
      const signed = await sign.mutateAsync({ documentId, password: values.password });
      onSigned(signed);
      requestClose();
    } catch (error) {
      form.setValue('password', '');
      setServerError(operacionalErrorMessage(error));
    }
  };

  return (
    <Sheet open={sheetOpen} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>Assinar com certificado digital</SheetTitle>
          <SheetDescription>“{documentTitle}” ganha a sua assinatura digital e não pode mais ser alterado.</SheetDescription>
        </SheetHeader>

        {missing || expired ? (
          <>
            <div className="min-h-0 flex-1 px-4 py-4">
              <Alert role="status">
                <AlertDescription>
                  {expired
                    ? 'O seu certificado está vencido. Envie um certificado válido para assinar.'
                    : 'Você ainda não enviou o seu certificado digital. Envie uma vez e depois é só digitar a senha para assinar.'}
                </AlertDescription>
              </Alert>
            </div>
            <SheetFooter className="border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="cursor-pointer" onClick={requestClose}>
                Fechar
              </Button>
              <Link href="/app/configuracoes/documentos" className={buttonVariants({ className: 'cursor-pointer' })}>
                Ir para Configurações → Documentos
              </Link>
            </SheetFooter>
          </>
        ) : (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              void form.handleSubmit(onSave)(event);
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <FieldGroup>
                {info ? (
                  <p className="text-sm text-muted-foreground">
                    Certificado: <span className="font-medium text-foreground">{info.subjectName}</span>
                  </p>
                ) : null}
                <Field>
                  <FieldLabel htmlFor="document-sign-password">Senha do certificado</FieldLabel>
                  <Input
                    id="document-sign-password"
                    type="password"
                    autoComplete="off"
                    aria-invalid={Boolean(form.formState.errors.password)}
                    {...form.register('password')}
                  />
                  <FieldDescription>A senha não fica guardada em lugar nenhum.</FieldDescription>
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
              <Button type="submit" className="cursor-pointer" disabled={sign.isPending || certificate.isLoading}>
                {sign.isPending ? 'Assinando…' : 'Assinar documento'}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
