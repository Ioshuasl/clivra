'use client';

import { Controller } from 'react-hook-form';
import { clinicoErrorMessage } from '@/packages/clinico/helpers/ClinicoErrorMessage';
import { maskCpf, maskPhone } from '@/packages/clinico/helpers/PatientMask';
import { usePatientEditFormHook } from '@/packages/clinico/hooks/Patient/usePatientEditFormHook';
import { usePatientUpdateHook } from '@/packages/clinico/hooks/Patient/usePatientUpdateHook';
import {
  toPatientUpdateInput,
  type PatientEditFormValues,
} from '@/packages/clinico/schemas/Patient/PatientEditSchema';
import type { PatientEditFormDialogProps } from '@/packages/clinico/types/Patient/PatientEditFormDialogTypes';
import { MotionDialogBody } from '@/shared/motion/MotionDialogBody';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';

export function PatientEditFormDialog({ patient, onClose }: PatientEditFormDialogProps) {
  const form = usePatientEditFormHook(patient);
  const update = usePatientUpdateHook(patient.id);
  const errors = form.formState.errors;

  const onSave = async (values: PatientEditFormValues) => {
    await update.mutateAsync(toPatientUpdateInput(values));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !update.isPending && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Editar cadastro do paciente</DialogTitle>
            <DialogDescription>
              Corrija os dados sem sair do atendimento. Só nome e telefone são obrigatórios.
            </DialogDescription>
          </DialogHeader>
          <form
            className="mt-4 grid gap-5"
            onSubmit={(event) => {
              void form.handleSubmit(onSave)(event);
            }}
          >
            <FieldGroup className="gap-4">
              <p className="text-sm font-semibold">Dados pessoais</p>
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="patient-edit-name">Nome completo</FieldLabel>
                <Input id="patient-edit-name" autoComplete="off" {...form.register('name')} />
                <FieldError>{errors.name?.message}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="patient-edit-social">Nome social (opcional)</FieldLabel>
                <Input id="patient-edit-social" {...form.register('socialName')} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field data-invalid={Boolean(errors.birthDate)}>
                  <FieldLabel htmlFor="patient-edit-birth">Nascimento</FieldLabel>
                  <Input id="patient-edit-birth" type="date" {...form.register('birthDate')} />
                  <FieldError>{errors.birthDate?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="patient-edit-sex">Sexo</FieldLabel>
                  <NativeSelect id="patient-edit-sex" className="w-full" {...form.register('sex')}>
                    <NativeSelectOption value="">Não informado</NativeSelectOption>
                    <NativeSelectOption value="F">Feminino</NativeSelectOption>
                    <NativeSelectOption value="M">Masculino</NativeSelectOption>
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="patient-edit-cpf">CPF</FieldLabel>
                  <Controller
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <Input
                        id="patient-edit-cpf"
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                        value={field.value ?? ''}
                        onBlur={field.onBlur}
                        onChange={(event) => field.onChange(maskCpf(event.target.value))}
                      />
                    )}
                  />
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup className="gap-4">
              <p className="text-sm font-semibold">Contato</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(errors.phonePrimary)}>
                  <FieldLabel htmlFor="patient-edit-phone">Telefone / WhatsApp</FieldLabel>
                  <Controller
                    control={form.control}
                    name="phonePrimary"
                    render={({ field }) => (
                      <Input
                        id="patient-edit-phone"
                        inputMode="tel"
                        placeholder="(11) 99999-0000"
                        value={field.value ?? ''}
                        onBlur={field.onBlur}
                        onChange={(event) => field.onChange(maskPhone(event.target.value))}
                      />
                    )}
                  />
                  <FieldError>{errors.phonePrimary?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="patient-edit-phone2">Outro telefone</FieldLabel>
                  <Controller
                    control={form.control}
                    name="phoneSecondary"
                    render={({ field }) => (
                      <Input
                        id="patient-edit-phone2"
                        inputMode="tel"
                        placeholder="(11) 99999-0000"
                        value={field.value ?? ''}
                        onBlur={field.onBlur}
                        onChange={(event) => field.onChange(maskPhone(event.target.value))}
                      />
                    )}
                  />
                </Field>
              </div>
              <Field data-invalid={Boolean(errors.email)}>
                <FieldLabel htmlFor="patient-edit-email">E-mail</FieldLabel>
                <Input id="patient-edit-email" type="email" {...form.register('email')} />
                <FieldError>{errors.email?.message}</FieldError>
              </Field>
            </FieldGroup>

            <FieldGroup className="gap-4">
              <p className="text-sm font-semibold">Endereço</p>
              <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                <Field>
                  <FieldLabel htmlFor="patient-edit-street">Rua</FieldLabel>
                  <Input id="patient-edit-street" {...form.register('street')} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="patient-edit-number">Número</FieldLabel>
                  <Input id="patient-edit-number" {...form.register('number')} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="patient-edit-complement">Complemento</FieldLabel>
                  <Input id="patient-edit-complement" {...form.register('complement')} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="patient-edit-district">Bairro</FieldLabel>
                  <Input id="patient-edit-district" {...form.register('district')} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_6rem_9rem]">
                <Field>
                  <FieldLabel htmlFor="patient-edit-city">Cidade</FieldLabel>
                  <Input id="patient-edit-city" {...form.register('city')} />
                </Field>
                <Field data-invalid={Boolean(errors.state)}>
                  <FieldLabel htmlFor="patient-edit-state">UF</FieldLabel>
                  <Input id="patient-edit-state" maxLength={2} placeholder="SP" {...form.register('state')} />
                  <FieldError>{errors.state?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="patient-edit-postal">CEP</FieldLabel>
                  <Input id="patient-edit-postal" inputMode="numeric" {...form.register('postalCode')} />
                </Field>
              </div>
            </FieldGroup>

            {update.isError ? (
              <Alert variant="destructive">
                <AlertDescription>{clinicoErrorMessage(update.error)}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={update.isPending} onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? 'Salvando…' : 'Salvar cadastro'}
              </Button>
            </DialogFooter>
          </form>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
