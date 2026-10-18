'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthCard } from '@/packages/public/components/Auth/AuthCard';
import { authErrorMessage } from '@/packages/public/helpers/AuthErrorMessage';
import { useAuthForgotPasswordFormHook } from '@/packages/public/hooks/Auth/useAuthForgotPasswordFormHook';
import { useAuthForgotPasswordHook } from '@/packages/public/hooks/Auth/useAuthForgotPasswordHook';
import type { AuthForgotPasswordFormValues } from '@/packages/public/schemas/Auth/AuthSchema';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

export function ForgotPasswordForm() {
  const form = useAuthForgotPasswordFormHook();
  const forgot = useAuthForgotPasswordHook();
  const [sent, setSent] = useState(false);

  const onSave = async (values: AuthForgotPasswordFormValues) => {
    await forgot.mutateAsync(values);
    setSent(true);
  };

  return (
    <AuthCard
      title="Recuperar senha"
      description="Enviaremos um link se o e-mail existir na base."
    >
      {sent ? (
        <div className="grid gap-4">
          <Alert>
            <AlertDescription>
              Se o e-mail estiver cadastrado, você receberá instruções em instantes.
            </AlertDescription>
          </Alert>
          <Link className="text-sm underline-offset-4 hover:underline" href="/login">
            Voltar ao login
          </Link>
        </div>
      ) : (
        <form
          method="post"
          className="grid gap-4"
          onSubmit={(e) => {
            void form.handleSubmit(onSave)(e);
          }}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.email)}>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
              <FieldError>{form.formState.errors.email?.message}</FieldError>
            </Field>
          </FieldGroup>

          {forgot.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{authErrorMessage(forgot.error)}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" disabled={forgot.isPending}>
            {forgot.isPending ? 'Enviando…' : 'Enviar link'}
          </Button>

          <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/login">
            Voltar ao login
          </Link>
        </form>
      )}
    </AuthCard>
  );
}
