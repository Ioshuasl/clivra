'use client';

import { useEffect, useMemo } from 'react';
import { addDays } from 'date-fns';
import { useAppointmentListHook } from '@/packages/operacional/hooks/Appointment/useAppointmentListHook';
import { useWaitlistOfferFormHook } from '@/packages/operacional/hooks/Waitlist/useWaitlistFormHook';
import { useWaitlistOfferHook } from '@/packages/operacional/hooks/Waitlist/useWaitlistOfferHook';
import type { WaitlistOfferFormValues } from '@/packages/operacional/schemas/Waitlist/WaitlistSchema';
import type { WaitlistOfferFormDialogProps } from '@/packages/operacional/types/Waitlist/WaitlistFormDialogTypes';
import { MotionDialogBody } from '@/shared/motion/MotionDialogBody';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/shared/ui/field';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';

export function WaitlistOfferFormDialog({
  open,
  waitlistId,
  professionalId,
  onClose,
}: WaitlistOfferFormDialogProps) {
  const form = useWaitlistOfferFormHook();
  const offer = useWaitlistOfferHook();
  const from = addDays(new Date(), -30).toISOString();
  const to = new Date().toISOString();
  const listQuery = useAppointmentListHook({
    professionalId,
    from,
    to,
    enabled: open && Boolean(professionalId),
  });

  const cancelled = useMemo(
    () =>
      (listQuery.data ?? []).filter(
        (appointment) => appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW',
      ),
    [listQuery.data],
  );

  useEffect(() => {
    if (open) form.reset({ appointmentId: '' });
  }, [open, form]);

  const onSave = async (values: WaitlistOfferFormValues) => {
    await offer.mutateAsync({ waitlistId, appointmentId: values.appointmentId });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Oferecer horário</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              void form.handleSubmit(onSave)(event);
            }}
          >
            <Field data-invalid={Boolean(form.formState.errors.appointmentId)}>
              <FieldLabel htmlFor="waitlist-offer-appointment">Horário cancelado</FieldLabel>
              <NativeSelect
                id="waitlist-offer-appointment"
                value={form.watch('appointmentId')}
                onChange={(event) =>
                  form.setValue('appointmentId', event.target.value, { shouldValidate: true })
                }
              >
                <NativeSelectOption value="">Escolha…</NativeSelectOption>
                {cancelled.map((appointment) => (
                  <NativeSelectOption key={appointment.id} value={appointment.id}>
                    {appointment.patient?.name ?? 'Paciente'} ·{' '}
                    {new Date(appointment.startsAt).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError>{form.formState.errors.appointmentId?.message}</FieldError>
            </Field>

            {cancelled.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum horário cancelado recente para oferecer.
              </p>
            ) : null}


            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={offer.isPending || cancelled.length === 0}>
                {offer.isPending ? 'Enviando…' : 'Oferecer'}
              </Button>
            </DialogFooter>
          </form>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
