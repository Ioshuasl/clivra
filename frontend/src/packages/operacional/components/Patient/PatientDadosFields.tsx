'use client';

import { Controller, type Path, type UseFormReturn } from 'react-hook-form';
import {
  PATIENT_SEX_LABELS,
  PATIENT_SEX_VALUES,
} from '@/packages/operacional/enum/Patient/PatientSexEnum';
import {
  formatCpfInputMask,
  formatPhoneInputMask,
} from '@/packages/operacional/helpers/FormatPatientContact';
import type {
  PatientCreateFormValues,
  PatientUpdateFormValues,
} from '@/packages/operacional/schemas/Patient/PatientSchema';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { Textarea } from '@/shared/ui/textarea';
import { DatePicker } from '@/shared/ui/date-picker';
import { dateToIso, isoToDate } from '@/shared/helpers/DateIso';

type PatientDadosFieldsProps<T extends PatientCreateFormValues> = {
  form: UseFormReturn<T>;
  idPrefix: string;
  showActive?: boolean;
  onCpfBlur?: () => void;
  onPhoneBlur?: () => void;
};

export function PatientDadosFields<T extends PatientCreateFormValues>({
  form,
  idPrefix,
  showActive = false,
  onCpfBlur,
  onPhoneBlur,
}: PatientDadosFieldsProps<T>) {
  const errors = form.formState.errors;
  const updateForm = form as unknown as UseFormReturn<PatientUpdateFormValues>;

  return (
    <FieldGroup className="gap-4">
      <Field data-invalid={Boolean(errors.name)}>
        <FieldLabel htmlFor={`${idPrefix}-name`}>Nome completo</FieldLabel>
        <Input
          id={`${idPrefix}-name`}
          autoComplete="name"
          {...form.register('name' as Path<T>)}
        />
        <FieldError>
          {typeof errors.name?.message === 'string' ? errors.name.message : null}
        </FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-social`}>Nome social</FieldLabel>
        <Input id={`${idPrefix}-social`} {...form.register('socialName' as Path<T>)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={Boolean(errors.phonePrimary)}>
          <FieldLabel htmlFor={`${idPrefix}-phone`}>Telefone</FieldLabel>
          <Controller
            control={form.control}
            name={'phonePrimary' as Path<T>}
            render={({ field }) => (
              <Input
                id={`${idPrefix}-phone`}
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 99999-0000"
                value={typeof field.value === 'string' ? field.value : ''}
                onBlur={() => {
                  field.onBlur();
                  onPhoneBlur?.();
                }}
                onChange={(event) => {
                  field.onChange(formatPhoneInputMask(event.target.value));
                }}
              />
            )}
          />
          <FieldError>
            {typeof errors.phonePrimary?.message === 'string'
              ? errors.phonePrimary.message
              : null}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-phone2`}>Telefone 2</FieldLabel>
          <Controller
            control={form.control}
            name={'phoneSecondary' as Path<T>}
            render={({ field }) => (
              <Input
                id={`${idPrefix}-phone2`}
                inputMode="tel"
                placeholder="(11) 99999-0000"
                value={typeof field.value === 'string' ? field.value : ''}
                onBlur={field.onBlur}
                onChange={(event) => {
                  field.onChange(formatPhoneInputMask(event.target.value));
                }}
              />
            )}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-cpf`}>CPF</FieldLabel>
          <Controller
            control={form.control}
            name={'cpf' as Path<T>}
            render={({ field }) => (
              <Input
                id={`${idPrefix}-cpf`}
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={typeof field.value === 'string' ? field.value : ''}
                onBlur={() => {
                  field.onBlur();
                  onCpfBlur?.();
                }}
                onChange={(event) => {
                  field.onChange(formatCpfInputMask(event.target.value));
                }}
              />
            )}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-birth`}>Nascimento</FieldLabel>
          <DatePicker
            id={`${idPrefix}-birth`}
            clearable={true}
            maxDate={new Date()}
            value={isoToDate(String(form.watch('birthDate' as Path<T>) ?? ''))}
            onChange={(next) =>
              form.setValue('birthDate' as Path<T>, dateToIso(next) as never, { shouldValidate: true, shouldDirty: true })
            }
            aria-invalid={Boolean(form.formState.errors['birthDate' as never])}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-sex`}>Sexo</FieldLabel>
          <Controller
            control={form.control}
            name={'sex' as Path<T>}
            render={({ field }) => (
              <NativeSelect
                id={`${idPrefix}-sex`}
                className="w-full max-w-none"
                value={typeof field.value === 'string' ? field.value : ''}
                onBlur={field.onBlur}
                onChange={(event) => {
                  field.onChange(event.target.value);
                }}
              >
                <NativeSelectOption value="">Não informado</NativeSelectOption>
                {PATIENT_SEX_VALUES.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {PATIENT_SEX_LABELS[value]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          />
        </Field>
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor={`${idPrefix}-email`}>E-mail</FieldLabel>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            autoComplete="email"
            {...form.register('email' as Path<T>)}
          />
          <FieldError>
            {typeof errors.email?.message === 'string' ? errors.email.message : null}
          </FieldError>
        </Field>
      </div>

      {showActive ? (
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-active`}>Status</FieldLabel>
          <NativeSelect
            id={`${idPrefix}-active`}
            className="w-full max-w-none"
            value={updateForm.watch('active') ? 'true' : 'false'}
            onChange={(event) =>
              updateForm.setValue('active', event.target.value === 'true', {
                shouldDirty: true,
              })
            }
          >
            <NativeSelectOption value="true">Ativo</NativeSelectOption>
            <NativeSelectOption value="false">Inativo</NativeSelectOption>
          </NativeSelect>
        </Field>
      ) : null}

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-notes`}>Observações</FieldLabel>
        <Textarea id={`${idPrefix}-notes`} rows={3} {...form.register('notes' as Path<T>)} />
      </Field>
    </FieldGroup>
  );
}
