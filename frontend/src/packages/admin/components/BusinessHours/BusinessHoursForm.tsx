'use client';

import { useEffect, useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { PlusIcon } from 'lucide-react';
import { useBusinessHoursFormHook } from '@/packages/admin/hooks/BusinessHours/useBusinessHoursFormHook';
import { useBusinessHoursListHook } from '@/packages/admin/hooks/BusinessHours/useBusinessHoursListHook';
import { useBusinessHoursReplaceHook } from '@/packages/admin/hooks/BusinessHours/useBusinessHoursReplaceHook';
import { useClinicGetHook } from '@/packages/admin/hooks/Clinic/useClinicGetHook';
import { useProfessionalListHook } from '@/packages/admin/hooks/Professional/useProfessionalListHook';
import type { BusinessHoursFormValues } from '@/packages/admin/schemas/BusinessHours/BusinessHoursSchema';
import { ClivraSurface } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { TimePicker } from '@/shared/ui/time-picker';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';

const WEEKDAYS = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
];

const UNIT_SCOPE = '';

export function BusinessHoursForm() {
  const clinicQuery = useClinicGetHook();
  const unitId = clinicQuery.data?.defaultUnit?.id;
  const professionalsQuery = useProfessionalListHook();
  const [professionalId, setProfessionalId] = useState<string>(UNIT_SCOPE);
  const scopeId = professionalId || null;

  const hoursQuery = useBusinessHoursListHook(unitId, scopeId);
  const form = useBusinessHoursFormHook();
  const replace = useBusinessHoursReplaceHook();
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'slots' });

  useEffect(() => {
    if (!hoursQuery.data) return;
    form.reset({
      slots: hoursQuery.data.map((slot) => ({
        weekday: slot.weekday,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
      })),
    });
  }, [hoursQuery.data, form]);

  const onSave = async (values: BusinessHoursFormValues) => {
    if (!unitId) return;
    await replace.mutateAsync({
      unitId,
      professionalId: scopeId,
      slots: values.slots,
    });
  };

  if (clinicQuery.isLoading || professionalsQuery.isLoading) {
    return (
      <ClivraSurface contentClassName="px-4 py-6">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </ClivraSurface>
    );
  }

  if (!unitId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Configure a unidade padrão da clínica primeiro.</AlertDescription>
      </Alert>
    );
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
              <h2 className="text-sm font-semibold text-foreground">Horários semanais</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Grade da unidade ou de um profissional.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => append({ weekday: 1, startsAt: '08:00', endsAt: '12:00' })}
              >
                <PlusIcon className="size-4" strokeWidth={1.7} />
                Adicionar slot
              </Button>
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={replace.isPending || hoursQuery.isLoading}
              >
                {replace.isPending ? 'Salvando…' : 'Salvar horários'}
              </Button>
            </div>
          </div>
        }
        contentClassName="grid gap-4 px-4 py-4"
      >
        <Field>
          <FieldLabel>Escopo</FieldLabel>
          <NativeSelect
            aria-label="Escopo dos horários"
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
          >
            <NativeSelectOption value={UNIT_SCOPE}>Unidade (padrão)</NativeSelectOption>
            {activeProfessionals.map((pro) => (
              <NativeSelectOption key={pro.id} value={pro.id}>
                {pro.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {scopeId ? (
            <FieldDescription>
              Sem slots próprios, o profissional herda o horário da unidade na disponibilidade.
            </FieldDescription>
          ) : null}
        </Field>

        {hoursQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando grade…</p>
        ) : (
          <FieldGroup>
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum slot. Adicione intervalos ou deixe vazio para herdar a unidade.
              </p>
            ) : null}
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-2 rounded-xl border border-border bg-background/60 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <Field>
                  <FieldLabel>Dia</FieldLabel>
                  <NativeSelect
                    aria-label={`Dia da semana (horário ${index + 1})`}
                    {...form.register(`slots.${index}.weekday`, { valueAsNumber: true })}
                  >
                    {WEEKDAYS.map((day) => (
                      <NativeSelectOption key={day.value} value={day.value}>
                        {day.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel>Início</FieldLabel>
                  <TimePicker
                    aria-label={`Início (horário ${index + 1})`}
                    aria-invalid={Boolean(form.formState.errors.slots?.message ?? form.formState.errors.slots?.[index]?.startsAt)}
                    value={form.watch(`slots.${index}.startsAt`)}
                    onChange={(next) =>
                      form.setValue(`slots.${index}.startsAt`, next, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel>Fim</FieldLabel>
                  <TimePicker
                    aria-label={`Fim (horário ${index + 1})`}
                    aria-invalid={Boolean(form.formState.errors.slots?.message ?? form.formState.errors.slots?.[index]?.endsAt)}
                    value={form.watch(`slots.${index}.endsAt`)}
                    onChange={(next) =>
                      form.setValue(`slots.${index}.endsAt`, next, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  />
                </Field>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    className="cursor-pointer"
                    aria-label={`Remover horário ${index + 1}`}
                    onClick={() => remove(index)}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
            <FieldError>{form.formState.errors.slots?.message}</FieldError>
          </FieldGroup>
        )}

        {replace.isSuccess ? (
          <Alert>
            <AlertDescription>Horários atualizados.</AlertDescription>
          </Alert>
        ) : null}
      </ClivraSurface>
    </form>
  );
}
