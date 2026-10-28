'use client';

import { useEffect, useState } from 'react';
import { useScheduleBlockFormHook } from '@/packages/operacional/hooks/Appointment/useAppointmentFormHook';
import { useScheduleBlockCreateHook } from '@/packages/operacional/hooks/Appointment/useScheduleBlockCreateHook';
import type { ScheduleBlockFormValues } from '@/packages/operacional/schemas/Appointment/AppointmentSchema';
import type { ScheduleBlockFormDialogProps } from '@/packages/operacional/types/Appointment/ScheduleBlockFormDialogTypes';
import { MotionDialogBody } from '@/shared/motion/MotionDialogBody';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { DatePicker } from '@/shared/ui/date-picker';
import { Input } from '@/shared/ui/input';
import { TimePicker } from '@/shared/ui/time-picker';
import { dateToIso, isoToDate } from '@/shared/helpers/DateIso';

const pad = (n: number) => String(n).padStart(2, '0');

/** `Date` → `AAAA-MM-DDTHH:mm` no relógio local. */
function toLocalInput(date: Date): string {
  return `${dateToIso(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ScheduleBlockFormDialog({
  open,
  professionalId,
  chairId,
  startsAt,
  endsAt,
  onClose,
}: ScheduleBlockFormDialogProps) {
  const form = useScheduleBlockFormHook({ startsAt, endsAt });
  const create = useScheduleBlockCreateHook();
  const [rangeError, setRangeError] = useState('');
  const [conflicts, setConflicts] = useState<
    Array<{ appointmentId: string; startsAt: string; endsAt: string }>
  >([]);

  const handleForm = () => {
    form.reset({ startsAt, endsAt, reason: '' });
    setConflicts([]);
    setRangeError('');
  };

  useEffect(() => {
    handleForm();
  }, [startsAt, endsAt, form]);

  const onSubmit = async (values: ScheduleBlockFormValues) => {
    if (new Date(values.endsAt).getTime() <= new Date(values.startsAt).getTime()) {
      setRangeError('O fim precisa ser depois do início.');
      return;
    }
    const result = await create.mutateAsync({
      professionalId: professionalId || null,
      chairId: chairId || null,
      startsAt: new Date(values.startsAt).toISOString(),
      endsAt: new Date(values.endsAt).toISOString(),
      reason: values.reason,
    });
    setConflicts(result.conflicts);
    if (result.conflicts.length === 0) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Bloquear horário</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e);
            }}
          >
            <FieldGroup>
              {(['startsAt', 'endsAt'] as const).map((name) => {
                const prefix = name === 'startsAt' ? 'block-start' : 'block-end';
                const [datePart = '', timePart = ''] = form.watch(name).split('T');
                const setWhen = (nextDate: string, nextTime: string) => {
                  const next = `${nextDate}T${nextTime}`;
                  const options = { shouldValidate: true, shouldDirty: true };
                  setRangeError('');
                  // Ao mudar o início, o fim acompanha e a duração do bloqueio se mantém.
                  if (name === 'startsAt') {
                    const oldStart = new Date(form.getValues('startsAt')).getTime();
                    const oldEnd = new Date(form.getValues('endsAt')).getTime();
                    const newStart = new Date(next).getTime();
                    if (oldEnd > oldStart && !Number.isNaN(newStart)) {
                      form.setValue('endsAt', toLocalInput(new Date(newStart + (oldEnd - oldStart))), options);
                    }
                  }
                  form.setValue(name, next, options);
                };
                return (
                  <div key={name} className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-3">
                    <Field>
                      <FieldLabel htmlFor={`${prefix}-date`}>
                        {name === 'startsAt' ? 'Início' : 'Fim'}
                      </FieldLabel>
                      <DatePicker
                        id={`${prefix}-date`}
                        clearable={false}
                        value={isoToDate(datePart)}
                        onChange={(next) => setWhen(dateToIso(next), timePart || '08:00')}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${prefix}-time`}>Horário</FieldLabel>
                      <TimePicker
                        id={`${prefix}-time`}
                        step={15}
                        value={timePart.slice(0, 5)}
                        onChange={(next) => next && setWhen(datePart, next)}
                      />
                    </Field>
                  </div>
                );
              })}
              <Field data-invalid={Boolean(form.formState.errors.reason)}>
                <FieldLabel htmlFor="block-reason">Motivo</FieldLabel>
                <Input id="block-reason" {...form.register('reason')} />
                <FieldError>{form.formState.errors.reason?.message}</FieldError>
              </Field>
            </FieldGroup>

            {conflicts.length > 0 ? (
              <Alert role="alert">
                <AlertTitle>Conflitos (não cancelados)</AlertTitle>
                <AlertDescription>
                  {conflicts.length} agendamento(s) sobrepostos. O bloqueio foi criado; ajuste
                  manualmente se necessário.
                </AlertDescription>
              </Alert>
            ) : null}

            {rangeError ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{rangeError}</AlertDescription>
              </Alert>
            ) : null}


            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {conflicts.length > 0 ? 'Fechar' : 'Cancelar'}
              </Button>
              {conflicts.length === 0 ? (
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? 'Salvando…' : 'Bloquear'}
                </Button>
              ) : null}
            </DialogFooter>
          </form>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
