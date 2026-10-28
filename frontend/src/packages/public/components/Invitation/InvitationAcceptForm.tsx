'use client';

import { useRouter } from 'next/navigation';
import { AuthCard } from '@/packages/public/components/Auth/AuthCard';
import { useInvitationAcceptFormHook } from '@/packages/public/hooks/Invitation/useInvitationAcceptFormHook';
import { useInvitationAcceptHook } from '@/packages/public/hooks/Invitation/useInvitationAcceptHook';
import type { InvitationAcceptFormValues } from '@/packages/public/schemas/Invitation/InvitationSchema';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

type InvitationAcceptFormProps = {
  token: string;
};

export function InvitationAcceptForm({ token }: InvitationAcceptFormProps) {
  const router = useRouter();
  const form = useInvitationAcceptFormHook(token);
  const accept = useInvitationAcceptHook();

  const onSave = async (values: InvitationAcceptFormValues) => {
    await accept.mutateAsync(values);
    router.replace('/app');
  };

  if (!token) {
    return (
      <AuthCard title="Convite inválido">
        <Alert variant="destructive">
          <AlertDescription>O link do convite está incompleto.</AlertDescription>
        </Alert>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Aceitar convite" description="Crie sua conta para entrar na clínica.">
      <form
        method="post"
        className="grid gap-4"
        onSubmit={(e) => {
          void form.handleSubmit(onSave)(e);
        }}
      >
        <input type="hidden" {...form.register('token')} />
        <FieldGroup>
          <Field data-invalid={Boolean(form.formState.errors.name)}>
            <FieldLabel htmlFor="name">Seu nome</FieldLabel>
            <Input id="name" {...form.register('name')} />
            <FieldError>{form.formState.errors.name?.message}</FieldError>
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.password)}>
            <FieldLabel htmlFor="password">Senha</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
            <FieldError>{form.formState.errors.password?.message}</FieldError>
          </Field>
        </FieldGroup>


        <Button type="submit" disabled={accept.isPending}>
          {accept.isPending ? 'Entrando…' : 'Aceitar e entrar'}
        </Button>
      </form>
    </AuthCard>
  );
}
