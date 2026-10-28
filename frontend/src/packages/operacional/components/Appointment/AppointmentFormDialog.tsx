'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Controller } from 'react-hook-form';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useAppointmentCreateHook,
  useAppointmentSeriesCreateHook,
} from '@/packages/operacional/hooks/Appointment/useAppointmentCreateHook';
import { useAppointmentCreateFormHook } from '@/packages/operacional/hooks/Appointment/useAppointmentFormHook';
import { usePatientListHook } from '@/packages/operacional/hooks/Patient/usePatientListHook';
import type { AppointmentCreateFormValues } from '@/packages/operacional/schemas/Appointment/AppointmentSchema';
import type { AppointmentFormDialogProps } from '@/packages/operacional/types/Appointment/AppointmentFormDialogTypes';
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
import { DatePicker } from '@/shared/ui/date-picker';
import { TimePicker } from '@/shared/ui/time-picker';
import { dateToIso, isoToDate } from '@/shared/helpers/DateIso';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import { Textarea } from '@/shared/ui/textarea';

function slotSummary(startsAt: string, endsAt: string): string {
  try {
    const start = parseISO(startsAt);
    const end = parseISO(endsAt);
    return `${format(start, "EEE, d MMM · HH:mm", { locale: ptBR })}–${format(end, 'HH:mm')}`;
  } catch {
    return '';
  }
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export function AppointmentFormDialog({
  open,
  professionalId,
  chairId,
  professionals = [],
  startsAt,
  endsAt,
  initialPatientId,
  initialPatientLabel,
  onClose,
}: AppointmentFormDialogProps) {
  const form = useAppointmentCreateFormHook({
    professionalId: professionalId ?? '',
    chairId: chairId ?? '',
    startsAt,
    endsAt,
    patientId: initialPatientId ?? '',
  });
  const create = useAppointmentCreateHook();
  const createSeries = useAppointmentSeriesCreateHook();
  const [patientSearch, setPatientSearch] = useState(initialPatientLabel ?? '');
  const deferredSearch = useDeferredValue(patientSearch);
  const patientsQuery = usePatientListHook(deferredSearch, { active: 'true', limit: 30 });
  const lockProfessional = Boolean(professionalId) && !chairId;

  const patients = patientsQuery.data?.items ?? [];
  const patientIds = useMemo(() => {
    const ids = patients.map((p) => p.id);
    if (initialPatientId && !ids.includes(initialPatientId)) {
      return [initialPatientId, ...ids];
    }
    return ids;
  }, [patients, initialPatientId]);
  // Guarda os nomes já carregados: ao escolher, o campo vira o nome, a busca muda e a lista esvazia.
  const patientLabels = useRef(new Map<string, string>());
  const patientLabelById = useMemo(() => {
    for (const p of patients) patientLabels.current.set(p.id, `#${p.code} ${p.name}`);
    return (id: string) => {
      const cached = patientLabels.current.get(id);
      if (cached) return cached;
      if (id === initialPatientId && initialPatientLabel) return initialPatientLabel;
      return id;
    };
  }, [patients, initialPatientId, initialPatientLabel]);

  const handleForm = () => {
    form.reset({
      patientId: initialPatientId ?? '',
      professionalId: professionalId ?? '',
      chairId: chairId ?? '',
      startsAt,
      endsAt,
      notes: '',
      recurring: false,
      rruleFreq: 'WEEKLY',
    });
    setPatientSearch(initialPatientLabel ?? '');
  };

  useEffect(() => {
    handleForm();
  }, [professionalId, chairId, startsAt, endsAt, initialPatientId, initialPatientLabel, form]);

  const { sheetOpen, requestClose, onOpenChange, onOpenChangeComplete } = useSheetOpenState(
    open,
    onClose,
  );

  const onSubmit = async (values: AppointmentCreateFormValues) => {
    const nextChairId = chairId ? chairId : null;
    if (values.recurring) {
      const durationMinutes = Math.max(
        5,
        Math.round(
          (new Date(values.endsAt || endsAt).getTime() - new Date(values.startsAt).getTime()) /
            60000,
        ),
      );
      await createSeries.mutateAsync({
        patientId: values.patientId,
        professionalId: values.professionalId,
        chairId: nextChairId,
        startsAt: values.startsAt,
        durationMinutes,
        rrule: `FREQ=${values.rruleFreq ?? 'WEEKLY'};INTERVAL=1`,
        notes: values.notes,
      });
    } else {
      await create.mutateAsync({
        patientId: values.patientId,
        professionalId: values.professionalId,
        chairId: nextChairId,
        startsAt: values.startsAt,
        endsAt: values.endsAt || endsAt,
        notes: values.notes,
      });
    }
    requestClose();
  };

  const pending = create.isPending || createSeries.isPending;
  const professionalName =
    professionals.find((p) => p.id === (professionalId || form.watch('professionalId')))?.name ??
    null;
  // Data, horário e duração editáveis: o formulário guarda sempre o início/fim em ISO.
  const watchedStart = form.watch('startsAt') || startsAt;
  const watchedEnd = form.watch('endsAt') || endsAt;
  const startDate = parseISO(watchedStart);
  const endDate = parseISO(watchedEnd);
  const validStart = !Number.isNaN(startDate.getTime());
  const dateValue = validStart ? format(startDate, 'yyyy-MM-dd') : '';
  const timeValue = validStart ? format(startDate, 'HH:mm') : '';
  const durationMinutes =
    validStart && !Number.isNaN(endDate.getTime())
      ? Math.max(5, Math.round((endDate.getTime() - startDate.getTime()) / 60000))
      : 30;
  const durationOptions = DURATION_OPTIONS.includes(durationMinutes)
    ? DURATION_OPTIONS
    : [...DURATION_OPTIONS, durationMinutes].sort((a, b) => a - b);

  const applyWhen = (date: string, time: string, minutes: number) => {
    if (!date || !time) return;
    const start = new Date(`${date}T${time}`);
    if (Number.isNaN(start.getTime())) return;
    form.setValue('startsAt', start.toISOString(), { shouldValidate: true });
    form.setValue('endsAt', new Date(start.getTime() + minutes * 60000).toISOString(), {
      shouldValidate: true,
    });
  };
  const summaryParts = [slotSummary(watchedStart, watchedEnd), professionalName].filter(Boolean);

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>Novo agendamento</SheetTitle>
          {summaryParts.length > 0 ? (
            <SheetDescription>{summaryParts.join(' · ')}</SheetDescription>
          ) : null}
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            void form.handleSubmit(onSubmit)(e);
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.patientId)}>
                <FieldLabel htmlFor="appt-patient">Paciente</FieldLabel>
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
                        id="appt-patient"
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

              <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3">
                <Field>
                  <FieldLabel htmlFor="appt-date">Data</FieldLabel>
                  <DatePicker
                    id="appt-date"
                    clearable={false}
                    value={isoToDate(dateValue)}
                    onChange={(next) => applyWhen(dateToIso(next), timeValue, durationMinutes)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="appt-time">Horário</FieldLabel>
                  <TimePicker
                    id="appt-time"
                    step={15}
                    value={timeValue}
                    onChange={(next) => applyWhen(dateValue, next, durationMinutes)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="appt-duration">Duração</FieldLabel>
                  <NativeSelect
                    id="appt-duration"
                    value={String(durationMinutes)}
                    onChange={(e) => applyWhen(dateValue, timeValue, Number(e.target.value))}
                  >
                    {durationOptions.map((minutes) => (
                      <NativeSelectOption key={minutes} value={String(minutes)}>
                        {minutes} min
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </div>

              {!lockProfessional ? (
                <Field data-invalid={Boolean(form.formState.errors.professionalId)}>
                  <FieldLabel htmlFor="appt-professional">Profissional</FieldLabel>
                  <NativeSelect
                    id="appt-professional"
                    value={form.watch('professionalId')}
                    onChange={(e) =>
                      form.setValue('professionalId', e.target.value, { shouldValidate: true })
                    }
                  >
                    <NativeSelectOption value="">Escolha…</NativeSelectOption>
                    {professionals.map((p) => (
                      <NativeSelectOption key={p.id} value={p.id}>
                        {p.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError>{form.formState.errors.professionalId?.message}</FieldError>
                </Field>
              ) : null}

              <Field>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="appt-recurring"
                    checked={Boolean(form.watch('recurring'))}
                    onCheckedChange={(checked) =>
                      form.setValue('recurring', checked === true)
                    }
                  />
                  <FieldLabel htmlFor="appt-recurring" className="font-normal">
                    Recorrente (série)
                  </FieldLabel>
                </div>
              </Field>

              {form.watch('recurring') ? (
                <Field>
                  <FieldLabel htmlFor="appt-rrule">Frequência</FieldLabel>
                  <NativeSelect
                    id="appt-rrule"
                    value={form.watch('rruleFreq') ?? 'WEEKLY'}
                    onChange={(e) =>
                      form.setValue('rruleFreq', e.target.value as 'WEEKLY' | 'MONTHLY')
                    }
                  >
                    <NativeSelectOption value="WEEKLY">Semanal</NativeSelectOption>
                    <NativeSelectOption value="MONTHLY">Mensal</NativeSelectOption>
                  </NativeSelect>
                </Field>
              ) : null}

              <Field>
                <FieldLabel htmlFor="appt-notes">Observações</FieldLabel>
                <Textarea
                  id="appt-notes"
                  rows={3}
                  placeholder="Opcional"
                  value={form.watch('notes') ?? ''}
                  onChange={(e) => form.setValue('notes', e.target.value)}
                />
              </Field>
            </FieldGroup>

          </div>

          <SheetFooter className="border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={requestClose}
            >
              Cancelar
            </Button>
            <Button type="submit" className="cursor-pointer" disabled={pending}>
              {pending ? 'Salvando…' : 'Agendar'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
