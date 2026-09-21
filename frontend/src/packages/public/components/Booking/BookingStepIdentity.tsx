'use client';

import type { UseFormReturn } from 'react-hook-form';
import type { BookingIdentityFormValues } from '@/packages/public/schemas/Booking/BookingSchema';
import { cn } from '@/shared/helpers/utils';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

type BookingStepIdentityProps = {
  form: UseFormReturn<BookingIdentityFormValues>;
  pending: boolean;
  errorMessage?: string | null;
  onBack: () => void;
  onSave: (values: BookingIdentityFormValues) => void;
};

const inputClassName = cn(
  'h-11 rounded-[10px] border-border bg-muted/60 text-[15px] shadow-none sm:h-12',
  'placeholder:text-muted-foreground/70 focus-visible:border-secondary focus-visible:bg-card',
);

export function BookingStepIdentity({
  form,
  pending,
  errorMessage,
  onBack,
  onSave,
}: BookingStepIdentityProps) {
  return (
    <form
      className="flex flex-1 flex-col gap-4 sm:gap-5"
      onSubmit={(event) => {
        void form.handleSubmit(onSave)(event);
      }}
    >
      <FieldGroup className="gap-4 sm:gap-4">
        <Field data-invalid={Boolean(form.formState.errors.name)}>
          <FieldLabel htmlFor="booking-name" className="text-[13px] font-semibold sm:text-[14px]">
            Nome completo
          </FieldLabel>
          <Input
            id="booking-name"
            autoComplete="name"
            className={inputClassName}
            {...form.register('name')}
          />
          <FieldError>{form.formState.errors.name?.message}</FieldError>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
          <Field data-invalid={Boolean(form.formState.errors.phone)}>
            <FieldLabel htmlFor="booking-phone" className="text-[13px] font-semibold sm:text-[14px]">
              Telefone / WhatsApp
            </FieldLabel>
            <Input
              id="booking-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className={inputClassName}
              {...form.register('phone')}
            />
            <FieldError>{form.formState.errors.phone?.message}</FieldError>
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.email)}>
            <FieldLabel htmlFor="booking-email" className="text-[13px] font-semibold sm:text-[14px]">
              E-mail
            </FieldLabel>
            <Input
              id="booking-email"
              type="email"
              autoComplete="email"
              className={inputClassName}
              {...form.register('email')}
            />
            <FieldError>{form.formState.errors.email?.message}</FieldError>
          </Field>
        </div>

        <Field data-invalid={Boolean(form.formState.errors.patientNote)}>
          <FieldLabel htmlFor="booking-note" className="text-[13px] font-semibold sm:text-[14px]">
            O que te traz? <span className="font-normal text-muted-foreground">(opcional)</span>
          </FieldLabel>
          <Textarea
            id="booking-note"
            rows={3}
            placeholder="Ex.: dor no dente, limpeza, retorno…"
            className="min-h-[5.5rem] rounded-[10px] border-border bg-muted/60 text-[15px] shadow-none placeholder:text-muted-foreground/70 focus-visible:border-secondary focus-visible:bg-card"
            {...form.register('patientNote')}
          />
          <FieldError>{form.formState.errors.patientNote?.message}</FieldError>
        </Field>

        <div className="grid gap-3 rounded-[12px] border border-border bg-muted/40 px-3.5 py-3.5 sm:px-4">
          <Field data-invalid={Boolean(form.formState.errors.consentDataProcessing)}>
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="booking-consent-data"
                className="mt-0.5"
                checked={form.watch('consentDataProcessing')}
                onCheckedChange={(checked) => {
                  form.setValue('consentDataProcessing', checked === true, { shouldValidate: true });
                }}
              />
              <FieldLabel
                htmlFor="booking-consent-data"
                className="cursor-pointer text-[13px] leading-snug font-normal sm:text-[14px]"
              >
                Aceito o tratamento dos meus dados pessoais
              </FieldLabel>
            </div>
            <FieldError>{form.formState.errors.consentDataProcessing?.message}</FieldError>
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.consentTerms)}>
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="booking-consent-terms"
                className="mt-0.5"
                checked={form.watch('consentTerms')}
                onCheckedChange={(checked) => {
                  form.setValue('consentTerms', checked === true, { shouldValidate: true });
                }}
              />
              <FieldLabel
                htmlFor="booking-consent-terms"
                className="cursor-pointer text-[13px] leading-snug font-normal sm:text-[14px]"
              >
                Aceito os termos de uso
              </FieldLabel>
            </div>
            <FieldError>{form.formState.errors.consentTerms?.message}</FieldError>
          </Field>
          <Field>
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="booking-consent-marketing"
                className="mt-0.5"
                checked={form.watch('consentWhatsappMarketing')}
                onCheckedChange={(checked) => {
                  form.setValue('consentWhatsappMarketing', checked === true);
                }}
              />
              <FieldLabel
                htmlFor="booking-consent-marketing"
                className="cursor-pointer text-[13px] leading-snug font-normal sm:text-[14px]"
              >
                Quero receber novidades no WhatsApp{' '}
                <span className="text-muted-foreground">(opcional)</span>
              </FieldLabel>
            </div>
          </Field>
        </div>
      </FieldGroup>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-auto grid gap-2 pt-1 sm:pt-2">
        <Button
          type="submit"
          size="lg"
          className="h-11 w-full cursor-pointer rounded-[10px] text-[15px] font-semibold sm:h-12"
          disabled={pending}
        >
          {pending ? 'Enviando código…' : 'Enviar código'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full cursor-pointer rounded-[10px] sm:h-12"
          onClick={onBack}
          disabled={pending}
        >
          Voltar
        </Button>
      </div>
    </form>
  );
}
