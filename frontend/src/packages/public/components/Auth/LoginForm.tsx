'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  UserPlusIcon,
} from 'lucide-react';
import { AuthBrandPanel } from '@/packages/public/components/Auth/AuthBrandPanel';
import { authErrorMessage } from '@/packages/public/helpers/AuthErrorMessage';
import { useAuthLoginFormHook } from '@/packages/public/hooks/Auth/useAuthLoginFormHook';
import { useAuthLoginHook } from '@/packages/public/hooks/Auth/useAuthLoginHook';
import type { AuthLoginFormValues } from '@/packages/public/schemas/Auth/AuthSchema';
import { ClivraLogo } from '@/shared/brand/ClivraLogo';
import { cn } from '@/shared/helpers/utils';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

/**
 * Login — tipografia em px (não rem) para não herdar o `html { font-size: 15px }`.
 * Notebook/altura baixa: densifica gaps e tipografia para caber em 1 viewport.
 */
export function LoginForm() {
  const router = useRouter();
  const form = useAuthLoginFormHook();
  const login = useAuthLoginHook();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const onSave = async (values: AuthLoginFormValues) => {
    await login.mutateAsync(values);
    router.replace('/app');
  };

  return (
    <div
      className={cn(
        'login-page grid min-h-dvh bg-[#F7F5F2]',
        'lg:h-dvh lg:max-h-dvh lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)] lg:overflow-hidden',
      )}
    >
      <div className="hidden min-h-0 lg:block">
        <AuthBrandPanel />
      </div>

      <main
        className={cn(
          'relative flex flex-col items-center justify-center',
          'px-6 py-8 sm:px-10 lg:min-h-0 lg:overflow-y-auto lg:px-12 lg:py-8',
          'xl:px-16',
          '[@media(max-height:820px)]:py-5 [@media(max-height:820px)]:justify-center',
          '[@media(max-height:720px)]:py-4',
        )}
      >
        <div className="mb-6 flex w-full max-w-[420px] justify-center lg:hidden">
          <ClivraLogo
            size={32}
            wordmarkClassName="login-display text-[20px] font-semibold text-primary"
          />
        </div>

        <div className="w-full max-w-[420px]">
          <div
            className={cn(
              'mb-7',
              '[@media(max-height:820px)]:mb-4',
              '[@media(max-height:720px)]:mb-3',
            )}
          >
            <div className="mb-4 h-0.5 w-10 bg-primary [@media(max-height:820px)]:mb-3" aria-hidden />
            <p className="login-sans mb-1.5 text-[13px] font-medium text-primary lg:text-[14px]">
              Bem-vindo de volta
            </p>
            <h1
              className={cn(
                'login-display font-semibold text-[#1A1A1A]',
                'text-[clamp(1.75rem,2vw+1rem,2.25rem)] leading-[1.15]',
                '[@media(max-height:820px)]:text-[1.75rem]',
                '[@media(max-height:720px)]:text-[1.5rem]',
              )}
            >
              Acesse sua conta
            </h1>
            <p
              className={cn(
                'login-sans mt-2 text-[14px] leading-snug text-[#6B6663] lg:text-[15px]',
                '[@media(max-height:820px)]:mt-1.5 [@media(max-height:820px)]:text-[13px]',
              )}
            >
              Informe seus dados para continuar com o Clivra.
            </p>
          </div>

          <form

            method="post"
            className={cn(
              'grid gap-4',
              '[@media(max-height:820px)]:gap-3',
              '[@media(max-height:720px)]:gap-2.5',
            )}
            onSubmit={(e) => {
              void form.handleSubmit(onSave)(e);
            }}
          >
            <FieldGroup className="gap-4 [@media(max-height:820px)]:gap-3">
              <Field data-invalid={Boolean(form.formState.errors.email)}>
                <FieldLabel
                  htmlFor="email"
                  className="login-sans text-[13px] font-semibold text-[#2A2A2A] lg:text-[14px]"
                >
                  E-mail
                </FieldLabel>
                <div className="relative">
                  <MailIcon
                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#8A847E]"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    className={cn(
                      'login-sans h-11 rounded-[10px] border-[#DDD8D3] bg-[#F3F0EC] pl-10 text-[15px] shadow-none md:text-[15px]',
                      'placeholder:text-[#9A948E] focus-visible:border-secondary focus-visible:bg-white',
                      '[@media(max-height:820px)]:h-10',
                    )}
                    {...form.register('email')}
                  />
                </div>
                <FieldError>{form.formState.errors.email?.message}</FieldError>
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.password)}>
                <FieldLabel
                  htmlFor="password"
                  className="login-sans text-[13px] font-semibold text-[#2A2A2A] lg:text-[14px]"
                >
                  Senha
                </FieldLabel>
                <div className="relative">
                  <LockIcon
                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#8A847E]"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    className={cn(
                      'login-sans h-11 rounded-[10px] border-[#DDD8D3] bg-[#F3F0EC] pr-11 pl-10 text-[15px] shadow-none md:text-[15px]',
                      'placeholder:text-[#9A948E] focus-visible:border-secondary focus-visible:bg-white',
                      '[@media(max-height:820px)]:h-10',
                    )}
                    {...form.register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-1 size-8 -translate-y-1/2 cursor-pointer text-[#6B6560] hover:bg-transparent hover:text-foreground"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </Button>
                </div>
                <FieldError>{form.formState.errors.password?.message}</FieldError>
              </Field>
            </FieldGroup>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="login-sans flex cursor-pointer items-center gap-2.5 text-[13px] text-[#4A4540] lg:text-[14px]">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  aria-label="Lembrar de mim"
                />
                Lembrar de mim
              </label>
              <Link
                className="login-sans text-[13px] font-semibold text-primary underline-offset-4 hover:underline lg:text-[14px]"
                href="/forgot-password"
              >
                Esqueceu sua senha?
              </Link>
            </div>

            {login.isError ? (
              <Alert variant="destructive">
                <AlertDescription>{authErrorMessage(login.error)}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              disabled={login.isPending}
              className={cn(
                'login-sans h-11 cursor-pointer gap-2 rounded-[10px] bg-primary text-[15px] font-semibold text-primary-foreground hover:bg-[#3A0C12]',
                '[@media(max-height:820px)]:h-10',
              )}
            >
              {login.isPending ? 'Entrando…' : 'Entrar'}
              {!login.isPending ? <ArrowRightIcon className="size-4" aria-hidden /> : null}
            </Button>

            <div className="relative py-1 [@media(max-height:720px)]:py-0.5">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#E5E1DC]" />
              <span className="login-sans relative mx-auto block w-fit bg-[#F7F5F2] px-3 text-[12px] text-[#8A847E] lg:text-[13px]">
                ou
              </span>
            </div>

            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/signup" />}
              className={cn(
                'login-sans h-11 justify-center gap-2.5 rounded-[10px] border-[#DDD8D3] bg-white text-[15px] font-medium text-[#2A2A2A] hover:bg-[#F3F0EC]',
                '[@media(max-height:820px)]:h-10',
              )}
            >
              <UserPlusIcon className="size-4 text-primary" strokeWidth={1.75} aria-hidden />
              Criar sua conta
            </Button>
          </form>

          <p
            className={cn(
              'login-sans mt-6 text-center text-[12px] text-[#6B6663] lg:mt-7 lg:text-[13px]',
              '[@media(max-height:820px)]:mt-4',
              '[@media(max-height:700px)]:hidden',
            )}
          >
            Não tem uma conta? Entre em contato com sua clínica.
          </p>
        </div>
      </main>
    </div>
  );
}
