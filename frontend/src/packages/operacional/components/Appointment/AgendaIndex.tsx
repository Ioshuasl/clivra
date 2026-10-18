'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LinkIcon } from 'lucide-react';
import { AgendaGrid } from '@/packages/operacional/components/Appointment/AgendaGrid';
import { AgendaToolbar } from '@/packages/operacional/components/Appointment/AgendaToolbar';
import { APPOINTMENT_STATUS_META } from '@/packages/operacional/enum/Appointment/AppointmentStatusEnum';
import type { SlotMinutes } from '@/packages/operacional/helpers/AgendaNotionTokens';
import {
  dayRange,
  rangeIso,
  snapMinutes,
  toYmd,
  weekDays,
  weekRange,
} from '@/packages/operacional/helpers/AgendaTime';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import { useAgendaChairListHook } from '@/packages/operacional/hooks/Appointment/useAgendaChairListHook';
import { useAgendaClinicSettingsHook } from '@/packages/operacional/hooks/Appointment/useAgendaClinicSettingsHook';
import { useAgendaProfessionalListHook } from '@/packages/operacional/hooks/Appointment/useAgendaProfessionalListHook';
import { useAppointmentListHook } from '@/packages/operacional/hooks/Appointment/useAppointmentListHook';
import { useAppointmentUpdateHook } from '@/packages/operacional/hooks/Appointment/useAppointmentUpdateHook';
import type {
  AgendaResourceMode,
  AgendaViewMode,
  AppointmentSummary,
} from '@/packages/operacional/types/Appointment/AppointmentTypes';
import { ApiClientError } from '@/shared/api/api-client';
import { useAuth } from '@/shared/auth/AuthProvider';
import { cn } from '@/shared/helpers/utils';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/shared/ui/card';
import { toast } from '@/shared/ui/toast';

const AppointmentDetailsDialog = dynamic(
  () =>
    import('@/packages/operacional/components/Appointment/AppointmentDetailsDialog').then(
      (m) => m.AppointmentDetailsDialog,
    ),
  { ssr: false },
);
const AppointmentFormDialog = dynamic(
  () =>
    import('@/packages/operacional/components/Appointment/AppointmentFormDialog').then(
      (m) => m.AppointmentFormDialog,
    ),
  { ssr: false },
);
const ScheduleBlockFormDialog = dynamic(
  () =>
    import('@/packages/operacional/components/Appointment/ScheduleBlockFormDialog').then(
      (m) => m.ScheduleBlockFormDialog,
    ),
  { ssr: false },
);
const WaitlistPanel = dynamic(
  () =>
    import('@/packages/operacional/components/Waitlist/WaitlistPanel').then(
      (m) => m.WaitlistPanel,
    ),
  { ssr: false },
);

function toLocalInput(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function defaultCreateSlot(anchor: Date, slotMinutes: SlotMinutes): {
  startsAt: string;
  endsAt: string;
} {
  const start = new Date(anchor);
  const now = new Date();
  if (toYmd(start) === toYmd(now)) {
    start.setHours(now.getHours(), snapMinutes(now.getMinutes(), slotMinutes), 0, 0);
    // Já fora do expediente comum (antes das 8h ou a partir das 18h): sugere 9h do dia seguinte.
    if (start.getHours() < 8 || start.getHours() >= 18) {
      start.setDate(start.getDate() + 1);
      start.setHours(9, 0, 0, 0);
    }
  } else {
    start.setHours(9, 0, 0, 0);
  }
  const end = new Date(start.getTime() + slotMinutes * 60000);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export function AgendaIndex() {
  const { tenant } = useAuth();
  const [viewMode, setViewMode] = useState<AgendaViewMode>('week');
  const [resourceMode, setResourceMode] = useState<AgendaResourceMode>('professional');
  const [anchor, setAnchor] = useState(() => new Date());
  const [slotMinutes, setSlotMinutes] = useState<SlotMinutes>(30);
  const [professionalId, setProfessionalId] = useState('');
  const [chairId, setChairId] = useState('');
  const [createSlot, setCreateSlot] = useState<{
    startsAt: string;
    endsAt: string;
    patientId?: string;
    patientLabel?: string;
    professionalId?: string;
  } | null>(null);
  const [selected, setSelected] = useState<AppointmentSummary | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const clinicSettingsQuery = useAgendaClinicSettingsHook();
  const chairsEnabled = clinicSettingsQuery.data?.chairsEnabled === true;
  const tenantSlug = tenant?.slug ?? null;

  const professionalsQuery = useAgendaProfessionalListHook();
  const chairsQuery = useAgendaChairListHook({ enabled: chairsEnabled });
  const professionals = professionalsQuery.data ?? [];
  const chairs = chairsQuery.data ?? [];

  useEffect(() => {
    if (!chairsEnabled && resourceMode === 'chair') {
      setResourceMode('professional');
    }
  }, [chairsEnabled, resourceMode]);

  useEffect(() => {
    if (!professionalId && professionals[0]) {
      setProfessionalId(professionals[0].id);
    }
  }, [professionals, professionalId]);

  useEffect(() => {
    if (!chairsEnabled) return;
    if (!chairId && chairs[0]) {
      setChairId(chairs[0].id);
    }
  }, [chairs, chairId, chairsEnabled]);

  const days = useMemo(
    () => (viewMode === 'week' ? weekDays(anchor) : [anchor]),
    [viewMode, anchor],
  );

  const { from, to } = useMemo(
    () => (viewMode === 'week' ? weekRange(anchor) : dayRange(anchor)),
    [viewMode, anchor],
  );
  const { from: fromIso, to: toIso } = rangeIso(from, to);

  const effectiveResourceMode: AgendaResourceMode =
    chairsEnabled && resourceMode === 'chair' ? 'chair' : 'professional';
  const activeProfessionalId =
    effectiveResourceMode === 'professional' ? professionalId : undefined;
  const activeChairId = effectiveResourceMode === 'chair' ? chairId : undefined;
  const resourceReady =
    effectiveResourceMode === 'professional' ? Boolean(professionalId) : Boolean(chairId);

  const listQuery = useAppointmentListHook({
    professionalId: activeProfessionalId,
    chairId: activeChairId,
    from: fromIso,
    to: toIso,
    enabled: resourceReady,
  });

  const update = useAppointmentUpdateHook({
    professionalId: activeProfessionalId,
    chairId: activeChairId,
    from: fromIso,
    to: toIso,
  });

  const appointments = (listQuery.data ?? []).filter(
    (a) => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW',
  );

  const anchorLabel =
    viewMode === 'week'
      ? `${format(days[0]!, 'd MMM', { locale: ptBR })} – ${format(days[6]!, 'd MMM yyyy', { locale: ptBR })}`
      : format(anchor, "EEEE, d 'de' MMMM", { locale: ptBR });

  const onMoveOrResize = async (input: {
    appointmentId: string;
    startsAt: string;
    endsAt: string;
  }) => {
    setMoveError(null);
    try {
      await update.mutateAsync({
        appointmentId: input.appointmentId,
        appointmentSchema: {
          startsAt: input.startsAt,
          endsAt: input.endsAt,
        },
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 409) {
        setMoveError(error.message || 'Horário indisponível — alteração desfeita.');
      } else {
        setMoveError(operacionalErrorMessage(error));
      }
    }
  };

  const blockDefaults = (() => {
    const day = days[0] ?? new Date();
    const start = new Date(day);
    start.setHours(12, 0, 0, 0);
    const end = new Date(day);
    end.setHours(13, 0, 0, 0);
    return { startsAt: toLocalInput(start), endsAt: toLocalInput(end) };
  })();

  const resourceError =
    effectiveResourceMode === 'professional' ? professionalsQuery.error : chairsQuery.error;
  const emptyResourceMessage =
    effectiveResourceMode === 'professional'
      ? 'Cadastre um profissional para visualizar a agenda.'
      : 'Cadastre uma cadeira para visualizar a agenda.';

  const openCreate = (startsAt?: Date, endsAt?: Date) => {
    if (startsAt && endsAt) {
      setCreateSlot({
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      });
      return;
    }
    setCreateSlot(defaultCreateSlot(anchor, slotMinutes));
  };

  const onCopyPublicBookingLink = async () => {
    if (!tenantSlug) return;
    const url = `${window.location.origin}/agendar/${tenantSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.add({
        type: 'success',
        title: 'Link de agendamento copiado',
        description: 'Envie para o paciente agendar sozinho.',
        timeout: 4000,
      });
    } catch {
      toast.add({
        type: 'error',
        title: 'Não foi possível copiar o link',
        timeout: 4000,
      });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Agenda</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {chairsEnabled
              ? 'Consultas do dia e da semana · visão por profissional ou cadeira.'
              : 'Consultas do dia e da semana por profissional.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={!tenantSlug}
            onClick={() => {
              void onCopyPublicBookingLink();
            }}
          >
            <LinkIcon />
            Copiar link público
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={!resourceReady}
            onClick={() => openCreate()}
          >
            Novo agendamento
          </Button>
        </div>
      </div>

      {resourceError ? (
        <Alert variant="destructive" role="alert" className="shrink-0">
          <AlertDescription>{operacionalErrorMessage(resourceError)}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="min-h-0 flex-1 gap-0 py-0">
        <CardHeader className="shrink-0 border-b border-border py-3">
          <AgendaToolbar
            viewMode={viewMode}
            onViewMode={setViewMode}
            anchorLabel={anchorLabel}
            onPrev={() => setAnchor((d) => addDays(d, viewMode === 'week' ? -7 : -1))}
            onNext={() => setAnchor((d) => addDays(d, viewMode === 'week' ? 7 : 1))}
            onToday={() => setAnchor(new Date())}
            slotMinutes={slotMinutes}
            onSlotMinutes={setSlotMinutes}
            resourceMode={effectiveResourceMode}
            onResourceMode={setResourceMode}
            chairsEnabled={chairsEnabled}
            professionals={professionals}
            professionalId={professionalId}
            onProfessionalId={setProfessionalId}
            chairs={chairs}
            chairId={chairId}
            onChairId={setChairId}
            onBlock={() => setBlockOpen(true)}
            waitlistOpen={waitlistOpen}
            onWaitlistToggle={() => setWaitlistOpen((open) => !open)}
          />
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col py-3">
          {!resourceReady ? (
            <p className="text-sm text-muted-foreground">{emptyResourceMessage}</p>
          ) : listQuery.isLoading ? (
            <div className="h-full min-h-64 animate-pulse rounded-lg bg-muted" aria-hidden />
          ) : listQuery.isError ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{operacionalErrorMessage(listQuery.error)}</AlertDescription>
            </Alert>
          ) : (
            <AgendaGrid
              days={days}
              appointments={appointments}
              slotMinutes={slotMinutes}
              showProfessional={effectiveResourceMode === 'chair'}
              onSlotClick={(startsAt, endsAt) => openCreate(startsAt, endsAt)}
              onOpenAppointment={setSelected}
              onMoveOrResize={(input) => {
                void onMoveOrResize(input);
              }}
            />
          )}

          {moveError ? (
            <Alert variant="destructive" className="mt-3 shrink-0" role="alert">
              <AlertDescription>{moveError}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="shrink-0 flex-wrap gap-2 border-border">
          {(['REQUESTED', 'SCHEDULED', 'CONFIRMED', 'IN_SERVICE', 'NO_SHOW'] as const).map(
            (status) => {
              const meta = APPOINTMENT_STATUS_META[status];
              return (
                <Badge
                  key={status}
                  variant="outline"
                  className={cn(
                    meta.bg,
                    meta.text,
                    meta.border,
                    status === 'REQUESTED' && 'border-dashed',
                  )}
                >
                  {meta.label}
                </Badge>
              );
            },
          )}
        </CardFooter>
      </Card>

      {waitlistOpen ? (
        <div className="flex max-h-[min(38%,22rem)] min-h-0 shrink-0 flex-col overflow-hidden">
          <WaitlistPanel professionalId={professionalId || undefined} />
        </div>
      ) : null}

      {createSlot ? (
        <AppointmentFormDialog
          open
          professionalId={
            createSlot.professionalId ??
            (effectiveResourceMode === 'professional' ? professionalId : professionals[0]?.id)
          }
          chairId={effectiveResourceMode === 'chair' ? chairId : undefined}
          professionals={professionals}
          startsAt={createSlot.startsAt}
          endsAt={createSlot.endsAt}
          initialPatientId={createSlot.patientId}
          initialPatientLabel={createSlot.patientLabel}
          onClose={() => setCreateSlot(null)}
        />
      ) : null}

      {selected ? (
        <AppointmentDetailsDialog
          appointment={selected}
          onClose={() => setSelected(null)}
          onReschedule={(appointment) => {
            const slot = defaultCreateSlot(anchor, slotMinutes);
            setCreateSlot({
              ...slot,
              patientId: appointment.patientId,
              patientLabel: appointment.patient?.name
                ? appointment.patient.name
                : undefined,
              professionalId: appointment.professionalId,
            });
          }}
        />
      ) : null}

      {blockOpen ? (
        <ScheduleBlockFormDialog
          open
          professionalId={effectiveResourceMode === 'professional' ? professionalId : null}
          chairId={effectiveResourceMode === 'chair' ? chairId : null}
          startsAt={blockDefaults.startsAt}
          endsAt={blockDefaults.endsAt}
          onClose={() => setBlockOpen(false)}
        />
      ) : null}

      <p className="sr-only">
        Visão {viewMode} por {effectiveResourceMode === 'chair' ? 'cadeira' : 'profissional'} a
        partir de {toYmd(anchor)}
      </p>
    </div>
  );
}
