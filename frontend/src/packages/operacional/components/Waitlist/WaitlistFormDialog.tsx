'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Controller } from 'react-hook-form';
import { WAITLIST_WEEKDAYS } from '@/packages/operacional/enum/Waitlist/WaitlistStatusEnum';
import { useAgendaProfessionalListHook } from '@/packages/operacional/hooks/Appointment/useAgendaProfessionalListHook';
import { usePatientListHook } from '@/packages/operacional/hooks/Patient/usePatientListHook';
import { useProcedureListHook } from '@/packages/operacional/hooks/Procedure/useProcedureListHook';
import { useWaitlistCreateHook } from '@/packages/operacional/hooks/Waitlist/useWaitlistCreateHook';
import { useWaitlistCreateFormHook } from '@/packages/operacional/hooks/Waitlist/useWaitlistFormHook';
import type { WaitlistCreateFormValues } from '@/packages/operacional/schemas/Waitlist/WaitlistSchema';
import type { WaitlistFormDialogProps } from '@/packages/operacional/types/Waitlist/WaitlistFormDialogTypes';
import { useSheetOpenState } from '@/shared/motion/useSheetOpenState';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/shared/ui/combobox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { TimePicker } from '@/shared/ui/time-picker';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';

export function WaitlistFormDialog({ open, professionalId, onClose }: WaitlistFormDialogProps) {
  const form = useWaitlistCreateFormHook(professionalId);
  const create = useWaitlistCreateHook();
  const professionalsQuery = useAgendaProfessionalListHook();
  const proceduresQuery = useProcedureListHook();
  const [patientSearch, setPatientSearch] = useState('');
  const deferredSearch = useDeferredValue(patientSearch);
  const patientsQuery = usePatientListHook(deferredSearch, { active: 'true', limit: 30 });
  const anyTime = form.watch('anyTime');

  const patients = patientsQuery.data?.items ?? [];
  const patientIds = useMemo(() => patients.map((patient) => patient.id), [patients]);
  // Guarda os nomes já carregados: ao escolher, o campo vira o nome, a busca muda e a lista esvazia.
  const patientLabels = useRef(new Map<string, string>());
  const patientLabelById = useMemo(() => {
    for (const patient of patients) {
      patientLabels.current.set(patient.id, `#${patient.code} ${patient.name}`);
    }
    return (id: string) => patientLabels.current.get(id) ?? id;
  }, [patients]);

  const handleForm = () => {
    form.reset({
      patientId: '',
      procedureId: '',
      professionalId: professionalId ?? '',
      priority: 0,
      anyTime: true,
      weekday: 1,
      from: '08:00',
      to: '12:00',
    });
    setPatientSearch('');
  };

  useEffect(() => {
    if (open) handleForm();
  }, [open, professionalId, form]);

  const { sheetOpen, requestClose, onOpenChange, onOpenChangeComplete } = useSheetOpenState(
    open,
    onClose,
  );

  const onSave = async (values: WaitlistCreateFormValues) => {
    await create.mutateAsync({
      patientId: values.patientId,
      procedureId: values.procedureId,
      professionalId: values.professionalId ? values.professionalId : null,
      priority: values.priority,
      preferredPeriods: values.anyTime
        ? []
        : [
            {
              weekday: values.weekday ?? 1,
              from: values.from ?? '08:00',
              to: values.to ?? '12:00',
            },
          ],
    });
    requestClose();
  };

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>Adicionar à fila</SheetTitle>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            void form.handleSubmit(onSave)(event);
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.patientId)}>
                <FieldLabel htmlFor="waitlist-patient">Paciente</FieldLabel>
                <Controller
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <Combobox
                      items={patientIds}
                      value={field.value || null}
                      onValueChange={(next) => {
                        field.onChange(typeof next === 'string' ? next : '');
                      }}
                      onInputValueChange={(value) => {
                        setPatientSearch(value);
                      }}
                      itemToStringLabel={patientLabelById}
                      filter={null}
                    >
                      <ComboboxInput
                        id="waitlist-patient"
                        placeholder="Buscar paciente…"
                        className="w-full"
                        showClear
                      />
                      <ComboboxContent className="z-[80]">
                        <ComboboxEmpty>
                          {patientsQuery.isLoading
                            ? 'Carregando…'
                            : 'Nenhum paciente encontrado.'}
                        </ComboboxEmpty>
                        <ComboboxList>
                          {(id: string) => (
                            <ComboboxItem key={id} value={id}>
                              {patientLabelById(id)}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  )}
                />
                <FieldError>{form.formState.errors.patientId?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.procedureId)}>
                <FieldLabel htmlFor="waitlist-procedure">Procedimento</FieldLabel>
                <NativeSelect
                  id="waitlist-procedure"
                  value={form.watch('procedureId')}
                  onChange={(event) =>
                    form.setValue('procedureId', event.target.value, { shouldValidate: true })
                  }
                >
                  <NativeSelectOption value="">Escolha…</NativeSelectOption>
                  {(proceduresQuery.data ?? [])
                    .filter((procedure) => procedure.active !== false)
                    .map((procedure) => (
                      <NativeSelectOption key={procedure.id} value={procedure.id}>
                        {procedure.name}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
                <FieldError>{form.formState.errors.procedureId?.message}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="waitlist-professional">Profissional (opcional)</FieldLabel>
                <NativeSelect
                  id="waitlist-professional"
                  value={form.watch('professionalId') ?? ''}
                  onChange={(event) => form.setValue('professionalId', event.target.value)}
                >
                  <NativeSelectOption value="">Qualquer profissional</NativeSelectOption>
                  {(professionalsQuery.data ?? []).map((professional) => (
                    <NativeSelectOption key={professional.id} value={professional.id}>
                      {professional.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="waitlist-priority">Prioridade</FieldLabel>
                <NativeSelect
                  id="waitlist-priority"
                  value={String(form.watch('priority'))}
                  onChange={(event) =>
                    form.setValue('priority', Number(event.target.value) === 1 ? 1 : 0)
                  }
                >
                  <NativeSelectOption value="0">Normal</NativeSelectOption>
                  <NativeSelectOption value="1">Urgente</NativeSelectOption>
                </NativeSelect>
              </Field>
              <Field>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="waitlist-anytime"
                    checked={anyTime}
                    onCheckedChange={(checked) => form.setValue('anyTime', checked === true)}
                  />
                  <FieldLabel htmlFor="waitlist-anytime" className="font-normal">
                    Qualquer horário
                  </FieldLabel>
                </div>
              </Field>
              {!anyTime ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field data-invalid={Boolean(form.formState.errors.weekday)}>
                    <FieldLabel htmlFor="waitlist-weekday">Dia</FieldLabel>
                    <NativeSelect
                      id="waitlist-weekday"
                      value={String(form.watch('weekday') ?? 1)}
                      onChange={(event) => form.setValue('weekday', Number(event.target.value))}
                    >
                      {WAITLIST_WEEKDAYS.map((day) => (
                        <NativeSelectOption key={day.value} value={String(day.value)}>
                          {day.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldError>{form.formState.errors.weekday?.message}</FieldError>
                  </Field>
                  <Field data-invalid={Boolean(form.formState.errors.from)}>
                    <FieldLabel htmlFor="waitlist-from">De</FieldLabel>
                    <TimePicker
                      id="waitlist-from"
                      value={form.watch('from') ?? ''}
                      onChange={(next) =>
                        form.setValue('from', next, { shouldValidate: true, shouldDirty: true })
                      }
                      aria-invalid={Boolean(form.formState.errors.from)}
                    />
                    <FieldError>{form.formState.errors.from?.message}</FieldError>
                  </Field>
                  <Field data-invalid={Boolean(form.formState.errors.to)}>
                    <FieldLabel htmlFor="waitlist-to">Até</FieldLabel>
                    <TimePicker
                      id="waitlist-to"
                      value={form.watch('to') ?? ''}
                      onChange={(next) =>
                        form.setValue('to', next, { shouldValidate: true, shouldDirty: true })
                      }
                      aria-invalid={Boolean(form.formState.errors.to)}
                    />
                    <FieldError>{form.formState.errors.to?.message}</FieldError>
                  </Field>
                </div>
              ) : null}
            </FieldGroup>

          </div>

          <SheetFooter className="border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="cursor-pointer" onClick={requestClose}>
              Cancelar
            </Button>
            <Button type="submit" className="cursor-pointer" disabled={create.isPending}>
              {create.isPending ? 'Salvando…' : 'Adicionar à fila'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
