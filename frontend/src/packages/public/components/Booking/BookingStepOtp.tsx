'use client';

import { Controller, type UseFormReturn } from 'react-hook-form';
import type { BookingOtpFormValues } from '@/packages/public/schemas/Booking/BookingSchema';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Field, FieldError, FieldLabel } from '@/shared/ui/field';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/shared/ui/input-otp';

type BookingStepOtpProps = {
  form: UseFormReturn<BookingOtpFormValues>;
  sentVia: string;
  pending: boolean;
  errorMessage?: string | null;
  onBack: () => void;
  onSave: (values: BookingOtpFormValues) => void;
};

export function BookingStepOtp({
  form,
  sentVia,
  pending,
  errorMessage,
  onBack,
  onSave,
}: BookingStepOtpProps) {
  const channelLabel = sentVia === 'WHATSAPP' ? 'WhatsApp' : 'e-mail';

  return (
    <form
      method="post"
      className="flex flex-1 flex-col gap-4 sm:gap-5"
      onSubmit={(event) => {
        void form.handleSubmit(onSave)(event);
      }}
    >
      <div className="rounded-[12px] border border-border bg-muted/40 px-4 py-3.5">
        <p className="text-[13px] leading-relaxed text-muted-foreground sm:text-[14px]">
          Enviamos um código de 6 dígitos por <span className="font-medium text-foreground">{channelLabel}</span>.
          Ele expira em 5 minutos.
        </p>
      </div>

      <Field data-invalid={Boolean(form.formState.errors.code)} className="items-center">
        <FieldLabel
          htmlFor="booking-otp"
          className="w-full text-center text-[13px] font-semibold sm:text-[14px]"
        >
          Código de verificação
        </FieldLabel>
        <Controller
          control={form.control}
          name="code"
          render={({ field }) => (
            <InputOTP
              id="booking-otp"
              maxLength={6}
              value={field.value}
              onChange={field.onChange}
              aria-label="Código de verificação"
              autoComplete="one-time-code"
              containerClassName="justify-center"
            >
              <InputOTPGroup className="gap-1.5 rounded-none border-0 sm:gap-2">
                <InputOTPSlot
                  index={0}
                  className="size-11 rounded-[10px] border border-input text-[18px] first:rounded-[10px] first:border-l sm:size-12"
                />
                <InputOTPSlot
                  index={1}
                  className="size-11 rounded-[10px] border border-input text-[18px] first:rounded-[10px] sm:size-12"
                />
                <InputOTPSlot
                  index={2}
                  className="size-11 rounded-[10px] border border-input text-[18px] first:rounded-[10px] sm:size-12"
                />
                <InputOTPSlot
                  index={3}
                  className="size-11 rounded-[10px] border border-input text-[18px] first:rounded-[10px] sm:size-12"
                />
                <InputOTPSlot
                  index={4}
                  className="size-11 rounded-[10px] border border-input text-[18px] first:rounded-[10px] sm:size-12"
                />
                <InputOTPSlot
                  index={5}
                  className="size-11 rounded-[10px] border border-input text-[18px] first:rounded-[10px] last:rounded-[10px] sm:size-12"
                />
              </InputOTPGroup>
            </InputOTP>
          )}
        />
        <FieldError className="text-center">{form.formState.errors.code?.message}</FieldError>
      </Field>

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
          {pending ? 'Confirmando…' : 'Confirmar agendamento'}
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
