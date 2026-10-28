'use client';

import { useState } from 'react';
import { useBusinessHoursExceptionCreateHook } from '@/packages/admin/hooks/BusinessHours/useBusinessHoursExceptionCreateHook';
import { useBusinessHoursExceptionFormHook } from '@/packages/admin/hooks/BusinessHours/useBusinessHoursExceptionFormHook';
import { useClinicGetHook } from '@/packages/admin/hooks/Clinic/useClinicGetHook';
import { useProfessionalListHook } from '@/packages/admin/hooks/Professional/useProfessionalListHook';
import type { BusinessHoursExceptionFormValues } from '@/packages/admin/schemas/BusinessHours/BusinessHoursSchema';
import type { ScheduleConflictSummary } from '@/packages/admin/types/BusinessHours/BusinessHoursTypes';
import { ClivraSurface } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { TimePicker } from '@/shared/ui/time-picker';
import { DatePicker } from '@/shared/ui/date-picker';
import { dateToIso, isoToDate } from '@/shared/helpers/DateIso';

export function BusinessHoursExceptionForm() {
  const clinicQuery = useClinicGetHook();
  const unitId = clinicQuery.data?.defaultUnit?.id;
  const professionalsQuery = useProfessionalListHook();
  const form = useBusinessHoursExceptionFormHook();
  const create = useBusinessHoursExceptionCreateHook();
  const [lastConflicts, setLastConflicts] = useState<ScheduleConflictSummary[] | null>(null);

  const closed = form.watch('closed');

  const onSave = async (values: BusinessHoursExceptionFormValues) => {
    if (!unitId) return;
    setLastConflicts(null);
    const result = await create.mutateAsync({
      unitId,
      professionalId: values.professionalId ? values.professionalId : null,
      date: values.date,
      closed: values.closed,
      startsAt: values.closed ? null : values.startsAt || null,
      endsAt: values.closed ? null : values.endsAt || null,
      reason: values.reason || null,
    });
    setLastConflicts(result.conflicts);
    form.reset({
      date: '',
      closed: true,
      startsAt: '',
      endsAt: '',
      reason: '',
      professionalId: values.professionalId ?? '',
    });
  };

  if (clinicQuery.isLoading || professionalsQuery.isLoading) {
    return null;
  }

  if (!unitId) {
    return null;
  }

  const activeProfessionals = (professionalsQuery.data ?? []).filter((p) => p.active);

  return (
    <form
      onSubmit={(e) => {
        void form.handleSubmit(onSave)(e);
      }}
    >
      <ClivraSurface
        toolbar={
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Exceções</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Feriado, férias ou dia especial. Agendamentos existentes não são cancelados.
              </p>
            </div>
            <Button type="submit" className="cursor-pointer" disabled={create.isPending}>
              {create.isPending ? 'Salvando…' : 'Salvar exceção'}
            </Button>
          </div>
        }
        contentClassName="grid gap-4 px-4 py-4"
      >
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="exception-date">Data</FieldLabel>
              <DatePicker
                id="exception-date"
                clearable={false}
                value={isoToDate(form.watch('date'))}
                onChange={(next) =>
                  form.setValue('date', dateToIso(next), { shouldValidate: true, shouldDirty: true })
                }
                aria-invalid={Boolean(form.formState.errors.date)}
              />
              <FieldError>{form.formState.errors.date?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Escopo</FieldLabel>
              <NativeSelect aria-label="Escopo da exceção" {...form.register('professionalId')}>
                <NativeSelectOption value="">Unidade inteira</NativeSelectOption>
                {activeProfessionals.map((pro) => (
                  <NativeSelectOption key={pro.id} value={pro.id}>
                    {pro.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <Field>
            <div className="flex items-center gap-2">
              <Checkbox
                id="exception-closed"
                checked={closed}
                onCheckedChange={(checked) => {
                  form.setValue('closed', checked === true, { shouldValidate: true });
                }}
              />
              <FieldLabel htmlFor="exception-closed" className="font-normal">
                Dia fechado (sem atendimento)
              </FieldLabel>
            </div>
          </Field>

          {!closed ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="exception-starts">Início</FieldLabel>
                <TimePicker
                  id="exception-starts"
                  value={form.watch('startsAt')}
                  onChange={(next) => form.setValue('startsAt', next, { shouldValidate: true, shouldDirty: true })}
                  aria-invalid={Boolean(form.formState.errors.startsAt)}
                />
                <FieldError>{form.formState.errors.startsAt?.message}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="exception-ends">Fim</FieldLabel>
                <TimePicker
                  id="exception-ends"
                  value={form.watch('endsAt')}
                  onChange={(next) => form.setValue('endsAt', next, { shouldValidate: true, shouldDirty: true })}
                  aria-invalid={Boolean(form.formState.errors.endsAt)}
                />
                <FieldError>{form.formState.errors.endsAt?.message}</FieldError>
              </Field>
            </div>
          ) : null}

          <Field>
            <FieldLabel htmlFor="exception-reason">Motivo (opcional)</FieldLabel>
            <Input
              id="exception-reason"
              placeholder="Ex.: Natal, férias"
              {...form.register('reason')}
            />
            <FieldError>{form.formState.errors.reason?.message}</FieldError>
          </Field>
        </FieldGroup>


        {lastConflicts !== null ? (
          lastConflicts.length === 0 ? (
            <Alert>
              <AlertDescription>
                Exceção salva. Nenhum agendamento em conflito no momento.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTitle>Exceção salva com conflitos</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  Os agendamentos abaixo permanecem; revise a agenda manualmente.
                </p>
                <ul className="list-inside list-disc text-sm">
                  {lastConflicts.map((item) => (
                    <li key={item.appointmentId}>
                      {item.startsAt} → {item.endsAt}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )
        ) : null}
      </ClivraSurface>
    </form>
  );
}
