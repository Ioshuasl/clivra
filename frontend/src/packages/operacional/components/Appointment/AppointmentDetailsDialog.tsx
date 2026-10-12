'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDownIcon } from 'lucide-react';
import {
  APPOINTMENT_STATUS_META,
  SERIES_DELETE_SCOPES,
  type AppointmentStatus,
  type SeriesDeleteScope,
} from '@/packages/operacional/enum/Appointment/AppointmentStatusEnum';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import { formatHour, parseInstant } from '@/packages/operacional/helpers/AgendaTime';
import {
  useAppointmentDeleteHook,
  useAppointmentSeriesDeleteHook,
  useAppointmentStatusHook,
} from '@/packages/operacional/hooks/Appointment/useAppointmentStatusHook';
import type { AppointmentSummary } from '@/packages/operacional/types/Appointment/AppointmentTypes';
import { useAuth } from '@/shared/auth/AuthProvider';
import { hasPermission } from '@/shared/auth/permissions';
import { useSheetOpenState } from '@/shared/motion/useSheetOpenState';
import { cn } from '@/shared/helpers/utils';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { Field, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import { toast } from '@/shared/ui/toast';

type AppointmentDetailsDialogProps = {
  appointment: AppointmentSummary | null;
  onClose: () => void;
  onReschedule?: (appointment: AppointmentSummary) => void;
};

type PanelMode = 'idle' | 'cancel' | 'no_show';

function asStatus(value: string): AppointmentStatus {
  return value in APPOINTMENT_STATUS_META ? (value as AppointmentStatus) : 'SCHEDULED';
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-[13px] font-medium text-foreground">{value}</p>
    </div>
  );
}

export function AppointmentDetailsDialog({
  appointment,
  onClose,
  onReschedule,
}: AppointmentDetailsDialogProps) {
  const router = useRouter();
  const { me } = useAuth();
  const canClinical = hasPermission(me, 'clinical_records.read');
  const statusMutation = useAppointmentStatusHook();
  const deleteMutation = useAppointmentDeleteHook();
  const seriesDelete = useAppointmentSeriesDeleteHook();

  const [panelMode, setPanelMode] = useState<PanelMode>('idle');
  const [cancelReason, setCancelReason] = useState('');
  const [otherOpen, setOtherOpen] = useState(false);
  const [seriesScope, setSeriesScope] = useState<SeriesDeleteScope>('THIS');

  useEffect(() => {
    if (!appointment) return;
    setPanelMode('idle');
    setCancelReason('');
    setSeriesScope('THIS');
    const status = asStatus(appointment.status);
    const clinical = hasPermission(me, 'clinical_records.read');
    const hasPrimary =
      status === 'REQUESTED' ||
      status === 'SCHEDULED' ||
      (clinical && (status === 'CONFIRMED' || status === 'IN_SERVICE'));
    setOtherOpen(!hasPrimary && status === 'CONFIRMED');
  }, [appointment, me]);

  const { sheetOpen, requestClose, onOpenChange, onOpenChangeComplete } = useSheetOpenState(
    true,
    onClose,
  );

  const pending =
    statusMutation.isPending || deleteMutation.isPending || seriesDelete.isPending;
  const error = statusMutation.error ?? deleteMutation.error ?? seriesDelete.error;

  const statusKey = appointment ? asStatus(appointment.status) : 'SCHEDULED';
  const statusMeta = APPOINTMENT_STATUS_META[statusKey];

  const canMarkNoShow = useMemo(() => {
    if (!appointment) return false;
    return new Date() >= parseInstant(appointment.startsAt);
  }, [appointment]);

  if (!appointment) return null;

  const start = parseInstant(appointment.startsAt);
  const end = parseInstant(appointment.endsAt);
  const isTerminal = statusKey === 'COMPLETED' || statusKey === 'CANCELLED';
  const canConfirm = statusKey === 'SCHEDULED';
  const canAccept = statusKey === 'REQUESTED';
  const canStart =
    canClinical && (statusKey === 'SCHEDULED' || statusKey === 'CONFIRMED');
  const canOpen = canClinical && statusKey === 'IN_SERVICE';
  const canCancel =
    statusKey === 'REQUESTED' ||
    statusKey === 'SCHEDULED' ||
    statusKey === 'CONFIRMED';
  const canNoShow = statusKey === 'SCHEDULED' || statusKey === 'CONFIRMED';
  const showOther = canCancel || canNoShow || Boolean(appointment.recurrenceId);

  const changeStatus = async (next: string, reason?: string) => {
    await statusMutation.mutateAsync({
      appointmentId: appointment.id,
      statusSchema: { status: next, reason },
    });
  };

  const onConfirm = async () => {
    await changeStatus('CONFIRMED');
    requestClose();
  };

  const onAccept = async () => {
    await changeStatus('SCHEDULED');
    requestClose();
  };

  const onStart = async () => {
    await changeStatus('IN_SERVICE');
    router.push(`/app/atendimento/${appointment.id}`);
  };

  const onMarkNoShow = async () => {
    await changeStatus('NO_SHOW');
    requestClose();
    toast.add({
      type: 'success',
      title: 'Falta registrada',
      timeout: 8000,
      actionProps: onReschedule
        ? {
            children: 'Reagendar',
            className: 'cursor-pointer',
            onClick: () => onReschedule(appointment),
          }
        : undefined,
    });
  };

  const onCancel = async () => {
    if (!cancelReason.trim()) return;
    await deleteMutation.mutateAsync({
      appointmentId: appointment.id,
      reason: cancelReason.trim(),
    });
    requestClose();
  };

  const onSeriesDelete = async () => {
    if (!appointment.recurrenceId) return;
    await seriesDelete.mutateAsync({
      seriesId: appointment.recurrenceId,
      scope: seriesScope,
      appointmentId: appointment.id,
      reason: 'Exclusão pela agenda',
    });
    requestClose();
  };

  const primaryLabel = (() => {
    if (canAccept) return 'Aceitar solicitação';
    if (canConfirm && !canStart) return 'Confirmar presença';
    if (canConfirm && canStart) return 'Confirmar presença';
    if (canStart && statusKey === 'CONFIRMED') return 'Iniciar atendimento';
    if (canOpen) return 'Abrir atendimento';
    return null;
  })();

  const onPrimary = () => {
    if (canAccept) return void onAccept();
    if (canConfirm) return void onConfirm();
    if (canStart && statusKey === 'CONFIRMED') return void onStart();
    if (canOpen) {
      router.push(`/app/atendimento/${appointment.id}`);
    }
  };

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>{appointment.patient?.name ?? 'Agendamento'}</SheetTitle>
          <SheetDescription>
            {formatHour(start)}–{formatHour(end)}
            {` · ${appointment.procedure?.name ?? 'Consulta / avaliação'}`}
          </SheetDescription>
          <Badge
            variant="outline"
            className={cn('mt-1 w-fit', statusMeta.bg, statusMeta.text, statusMeta.border)}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                statusKey === 'CONFIRMED' && 'bg-success',
                statusKey === 'SCHEDULED' && 'bg-info',
                statusKey === 'IN_SERVICE' && 'bg-warning',
                statusKey === 'NO_SHOW' && 'bg-destructive',
                statusKey === 'CANCELLED' && 'bg-muted-foreground',
                statusKey === 'COMPLETED' && 'bg-muted-foreground',
                statusKey === 'REQUESTED' && 'bg-muted-foreground',
              )}
              aria-hidden
            />
            {statusMeta.label}
          </Badge>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="grid gap-4">
            {!canClinical && statusKey === 'CONFIRMED' ? (
              <p className="rounded-[10px] bg-muted px-3 py-2 text-[11px] font-medium text-muted-foreground">
                Visão recepção — iniciar atendimento fica com o dentista.
              </p>
            ) : null}

            <div className="grid gap-3">
              <MetaRow
                label="Profissional"
                value={appointment.professional?.name ?? '—'}
              />
              <MetaRow
                label="Procedimento"
                value={appointment.procedure?.name ?? 'Consulta / avaliação'}
              />
              <MetaRow
                label="Observações"
                value={appointment.notes?.trim() || '—'}
              />
            </div>

            {!isTerminal ? (
              <div className="grid gap-2">
                <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Próximo passo
                </p>

                {primaryLabel ? (
                  <Button
                    type="button"
                    className="cursor-pointer"
                    disabled={pending}
                    onClick={onPrimary}
                  >
                    {pending
                      ? statusMutation.isPending
                        ? 'Salvando…'
                        : 'Aguarde…'
                      : primaryLabel}
                  </Button>
                ) : (
                  <p className="text-[13px] text-muted-foreground">
                    Nenhuma ação principal neste estado.
                  </p>
                )}

                {canConfirm && canStart ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    disabled={pending}
                    onClick={() => {
                      void onStart();
                    }}
                  >
                    {statusMutation.isPending ? 'Iniciando…' : 'Iniciar atendimento'}
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="rounded-[10px] bg-muted px-3 py-2 text-[12px] text-muted-foreground">
                {statusKey === 'COMPLETED'
                  ? 'Atendimento concluído. O status não muda mais por aqui.'
                  : 'Agendamento cancelado.'}
              </p>
            )}

            {showOther && !isTerminal ? (
              <Collapsible open={otherOpen} onOpenChange={setOtherOpen}>
                <div className="rounded-[12px] border border-border bg-background">
                  <CollapsibleTrigger
                    type="button"
                    className="flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-left text-[13px] font-semibold text-foreground"
                  >
                    Outras ações
                    <ChevronDownIcon
                      className={cn(
                        'size-4 text-muted-foreground transition-transform duration-200',
                        otherOpen && 'rotate-180',
                      )}
                      aria-hidden
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-border px-3 py-3">
                    <div className="grid gap-2">
                      {canNoShow && panelMode !== 'no_show' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer justify-start"
                          disabled={pending || !canMarkNoShow}
                          title={
                            canMarkNoShow
                              ? undefined
                              : 'Só é possível marcar falta após o horário de início'
                          }
                          onClick={() => setPanelMode('no_show')}
                        >
                          Marcar falta
                        </Button>
                      ) : null}

                      {panelMode === 'no_show' ? (
                        <div className="grid gap-2 rounded-[10px] border border-border bg-card p-3">
                          <p className="text-[13px] text-foreground">
                            Confirmar que o paciente não compareceu?
                          </p>
                          {!canMarkNoShow ? (
                            <p className="text-[12px] text-muted-foreground">
                              Aguarde o horário de início para registrar a falta.
                            </p>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="cursor-pointer"
                              disabled={pending || !canMarkNoShow}
                              onClick={() => {
                                void onMarkNoShow();
                              }}
                            >
                              {statusMutation.isPending ? 'Registrando…' : 'Confirmar falta'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer"
                              disabled={pending}
                              onClick={() => setPanelMode('idle')}
                            >
                              Voltar
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {canCancel && panelMode !== 'cancel' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer justify-start text-destructive hover:text-destructive"
                          disabled={pending}
                          onClick={() => setPanelMode('cancel')}
                        >
                          Cancelar…
                        </Button>
                      ) : null}

                      {panelMode === 'cancel' ? (
                        <div className="grid gap-2 rounded-[10px] border border-border bg-card p-3">
                          <Field>
                            <FieldLabel htmlFor="appt-cancel-reason">
                              Motivo do cancelamento
                            </FieldLabel>
                            <Input
                              id="appt-cancel-reason"
                              value={cancelReason}
                              placeholder="Ex.: paciente remarcou…"
                              onChange={(e) => setCancelReason(e.target.value)}
                            />
                          </Field>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="cursor-pointer"
                              disabled={pending || !cancelReason.trim()}
                              onClick={() => {
                                void onCancel();
                              }}
                            >
                              {deleteMutation.isPending
                                ? 'Cancelando…'
                                : 'Confirmar cancelamento'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer"
                              disabled={pending}
                              onClick={() => {
                                setPanelMode('idle');
                                setCancelReason('');
                              }}
                            >
                              Voltar
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {appointment.recurrenceId ? (
                        <div className="mt-1 grid gap-2 border-t border-border pt-3">
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Série recorrente
                          </p>
                          <NativeSelect
                            value={seriesScope}
                            onChange={(e) =>
                              setSeriesScope(e.target.value as SeriesDeleteScope)
                            }
                          >
                            {SERIES_DELETE_SCOPES.map((scope) => (
                              <NativeSelectOption key={scope} value={scope}>
                                {scope === 'THIS'
                                  ? 'Só esta'
                                  : scope === 'FUTURE'
                                    ? 'Esta e futuras'
                                    : 'Todas'}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="cursor-pointer"
                            disabled={pending}
                            onClick={() => {
                              void onSeriesDelete();
                            }}
                          >
                            {seriesDelete.isPending ? 'Excluindo…' : 'Excluir série'}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ) : null}

            {error ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{operacionalErrorMessage(error)}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        </div>

        <SheetFooter className="border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="cursor-pointer" onClick={requestClose}>
            Fechar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
