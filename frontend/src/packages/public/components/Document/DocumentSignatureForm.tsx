'use client';

import { useState } from 'react';
import { CircleCheckIcon } from 'lucide-react';
import { DocumentReadOnly } from '@/packages/public/components/Document/DocumentReadOnly';
import { DocumentSignatureShell } from '@/packages/public/components/Document/DocumentSignatureShell';
import { publicErrorMessage } from '@/packages/public/helpers/PublicErrorMessage';
import { useDocumentSignatureCodeHook } from '@/packages/public/hooks/Document/useDocumentSignatureCodeHook';
import { useDocumentSignatureFormHook } from '@/packages/public/hooks/Document/useDocumentSignatureFormHook';
import { useDocumentSignatureGetHook } from '@/packages/public/hooks/Document/useDocumentSignatureGetHook';
import { useDocumentSignatureSignHook } from '@/packages/public/hooks/Document/useDocumentSignatureSignHook';
import type { DocumentSignatureFormValues } from '@/packages/public/schemas/Document/DocumentSignatureSchema';
import type { DocumentSignatureFormProps } from '@/packages/public/types/Document/DocumentSignatureFormTypes';
import type { PublicSendCodeResult } from '@/packages/public/types/Document/DocumentSignatureTypes';
import { ApiClientError } from '@/shared/api/api-client';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';

const INVALID_LINK = 'Este link de assinatura não existe, já foi usado ou expirou. Peça um novo à clínica.';

export function DocumentSignatureForm({ token }: DocumentSignatureFormProps) {
  const view = useDocumentSignatureGetHook(token);
  const sendCode = useDocumentSignatureCodeHook();
  const sign = useDocumentSignatureSignHook();
  const form = useDocumentSignatureFormHook();
  const [codeSent, setCodeSent] = useState<PublicSendCodeResult | null>(null);
  const [signed, setSigned] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const requestCode = async () => {
    setServerError(null);
    try {
      setCodeSent(await sendCode.mutateAsync(token));
      form.setValue('code', '');
    } catch (error) {
      setServerError(publicErrorMessage(error));
    }
  };

  const onSave = async (values: DocumentSignatureFormValues) => {
    setServerError(null);
    if (view.data?.method === 'WHATSAPP_CODE' && !values.code) {
      form.setError('code', { message: 'Digite os 6 números do código.' });
      return;
    }
    try {
      await sign.mutateAsync({ token, code: values.code || undefined });
      setSigned(true);
    } catch (error) {
      setServerError(publicErrorMessage(error));
    }
  };

  if (view.isLoading) {
    return (
      <DocumentSignatureShell title="Carregando…">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-12 w-full" />
      </DocumentSignatureShell>
    );
  }

  if (view.isError || !view.data) {
    const notFound = view.error instanceof ApiClientError && view.error.status === 404;
    return (
      <DocumentSignatureShell title="Assinatura de documento">
        <Alert variant="destructive">
          <AlertDescription>{notFound ? INVALID_LINK : publicErrorMessage(view.error)}</AlertDescription>
        </Alert>
        {!notFound ? (
          <Button type="button" size="lg" className="w-full" onClick={() => void view.refetch()}>
            Tentar novamente
          </Button>
        ) : null}
      </DocumentSignatureShell>
    );
  }

  const data = view.data;

  if (signed) {
    return (
      <DocumentSignatureShell clinicName={data.clinicName} title="Documento assinado">
        <div
          role="status"
          className="grid justify-items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center"
        >
          <CircleCheckIcon className="size-12 text-success" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-base font-semibold text-foreground">Tudo certo, {data.patientFirstName}!</p>
          <p className="text-sm text-muted-foreground">
            A {data.clinicName} recebeu a sua assinatura em “{data.document.title}”. Você já pode fechar esta
            página.
          </p>
        </div>
      </DocumentSignatureShell>
    );
  }

  const needsCode = data.method === 'WHATSAPP_CODE';
  const agree = form.watch('agree');

  return (
    <DocumentSignatureShell
      clinicName={data.clinicName}
      title={data.document.title}
      description={`Olá, ${data.patientFirstName}! Leia o documento e assine no final da página.`}
    >
      <article
        aria-label={data.document.title}
        className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgb(74_15_22/0.04)]"
      >
        <DocumentReadOnly nodes={data.document.content.content} />
      </article>

      <form
        className="grid gap-4"
        onSubmit={(event) => {
          void form.handleSubmit(onSave)(event);
        }}
      >
        {needsCode ? (
          <div className="grid gap-3 rounded-2xl border border-border bg-card p-4">
            {codeSent ? (
              <>
                <p role="status" className="text-sm text-foreground">
                  Enviamos um código de 6 números para o seu {codeSent.sentVia === 'EMAIL' ? 'e-mail' : 'WhatsApp'} (
                  {codeSent.destinationHint}).
                </p>
                <Field>
                  <FieldLabel htmlFor="signature-code">Código de confirmação</FieldLabel>
                  <Input
                    id="signature-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    aria-invalid={Boolean(form.formState.errors.code)}
                    {...form.register('code')}
                  />
                  <FieldError errors={[form.formState.errors.code]} />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-fit cursor-pointer"
                  disabled={sendCode.isPending}
                  onClick={() => void requestCode()}
                >
                  Não chegou? Enviar de novo
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Para confirmar que é você, vamos enviar um código de 6 números.
                </p>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="w-full cursor-pointer"
                  disabled={sendCode.isPending}
                  onClick={() => void requestCode()}
                >
                  {sendCode.isPending ? 'Enviando…' : 'Receber código'}
                </Button>
              </>
            )}
          </div>
        ) : null}

        <Field>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-foreground">
            <Checkbox
              className="mt-0.5"
              checked={agree}
              aria-invalid={Boolean(form.formState.errors.agree)}
              onCheckedChange={(checked) => form.setValue('agree', checked === true, { shouldValidate: true })}
            />
            <span>Li o documento e concordo com ele.</span>
          </label>
          <FieldError errors={[form.formState.errors.agree]} />
          <FieldDescription>
            Ao assinar, guardamos a data, a hora e o aparelho usado, como comprovante.
          </FieldDescription>
        </Field>

        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-full cursor-pointer"
          disabled={sign.isPending || (needsCode && !codeSent)}
        >
          {sign.isPending ? 'Assinando…' : 'Assinar documento'}
        </Button>
      </form>
    </DocumentSignatureShell>
  );
}
