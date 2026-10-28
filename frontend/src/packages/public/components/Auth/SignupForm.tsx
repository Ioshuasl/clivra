'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthCard } from '@/packages/public/components/Auth/AuthCard';
import { useAuthSignupFormHook } from '@/packages/public/hooks/Auth/useAuthSignupFormHook';
import { useAuthSignupHook } from '@/packages/public/hooks/Auth/useAuthSignupHook';
import type { AuthSignupFormValues } from '@/packages/public/schemas/Auth/AuthSchema';
import { CLIVRA } from '@/shared/brand/ClivraBrand';
import { markOnboardingSuggest } from '@/shared/helpers/onboarding-suggest-flag';
import { Button } from '@/shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

export function SignupForm() {
  const router = useRouter();
  const form = useAuthSignupFormHook();
  const signup = useAuthSignupHook();

  const onSave = async (values: AuthSignupFormValues) => {
    await signup.mutateAsync(values);
    markOnboardingSuggest();
    router.replace('/app');
  };

  return (
    <AuthCard
      title="Criar clínica"
      description={`Comece no ${CLIVRA.name}: cadastro do owner e da clínica. Senha com no mínimo 10 caracteres.`}
    >
      <form
        method="post"
        className="grid gap-4"
        onSubmit={(e) => {
          void form.handleSubmit(onSave)(e);
        }}
      >
        <FieldGroup>
          <Field data-invalid={Boolean(form.formState.errors.clinicName)}>
            <FieldLabel htmlFor="clinicName">Nome da clínica</FieldLabel>
            <Input id="clinicName" {...form.register('clinicName')} />
            <FieldError>{form.formState.errors.clinicName?.message}</FieldError>
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.ownerName)}>
            <FieldLabel htmlFor="ownerName">Seu nome</FieldLabel>
            <Input id="ownerName" {...form.register('ownerName')} />
            <FieldError>{form.formState.errors.ownerName?.message}</FieldError>
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.email)}>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
            <FieldError>{form.formState.errors.email?.message}</FieldError>
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


        <Button type="submit" disabled={signup.isPending}>
          {signup.isPending ? 'Criando…' : 'Criar conta'}
        </Button>

        <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/login">
          Já tenho conta
        </Link>
      </form>
    </AuthCard>
  );
}
