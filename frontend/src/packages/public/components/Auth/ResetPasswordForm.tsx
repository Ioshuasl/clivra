'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthCard } from '@/packages/public/components/Auth/AuthCard';
import { authErrorMessage } from '@/packages/public/helpers/AuthErrorMessage';
import { useAuthResetPasswordFormHook } from '@/packages/public/hooks/Auth/useAuthResetPasswordFormHook';
import { useAuthResetPasswordHook } from '@/packages/public/hooks/Auth/useAuthResetPasswordHook';
import type { AuthResetPasswordFormValues } from '@/packages/public/schemas/Auth/AuthSchema';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const form = useAuthResetPasswordFormHook(token);
  const reset = useAuthResetPasswordHook();

  const onSave = async (values: AuthResetPasswordFormValues) => {
    await reset.mutateAsync(values);
    router.replace('/login');
  };

  if (!token) {
    return (
      <AuthCard title="Token inválido">
        <Alert variant="destructive">
          <AlertDescription>O link de redefinição está incompleto.</AlertDescription>
        </Alert>
        <Link className="mt-4 inline-block text-sm underline-offset-4 hover:underline" href="/forgot-password">
          Solicitar novo link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Nova senha" description="Defina uma senha com no mínimo 10 caracteres.">
      <form
        method="post"
        className="grid gap-4"
        onSubmit={(e) => {
          void form.handleSubmit(onSave)(e);
        }}
      >
        <input type="hidden" {...form.register('token')} />
        <FieldGroup>
          <Field data-invalid={Boolean(form.formState.errors.password)}>
            <FieldLabel htmlFor="password">Nova senha</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
            <FieldError>{form.formState.errors.password?.message}</FieldError>
          </Field>
        </FieldGroup>

        {reset.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{authErrorMessage(reset.error)}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={reset.isPending}>
          {reset.isPending ? 'Salvando…' : 'Salvar senha'}
        </Button>
      </form>
    </AuthCard>
  );
}
