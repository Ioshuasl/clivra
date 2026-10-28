'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { addDays, addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LinkIcon } from 'lucide-react';
import { AgendaGrid } from '@/packages/operacional/components/Appointment/AgendaGrid';
import { AgendaListView } from '@/packages/operacional/components/Appointment/AgendaListView';
import { AgendaMonthGrid } from '@/packages/operacional/components/Appointment/AgendaMonthGrid';
import { AgendaToolbar } from '@/packages/operacional/components/Appointment/AgendaToolbar';
import {
  APPOINTMENT_STATUS_META,
  type AppointmentStatus,
} from '@/packages/operacional/enum/Appointment/AppointmentStatusEnum';
import {
  AGENDA_ALL_PROFESSIONALS,
  type SlotMinutes,
} from '@/packages/operacional/helpers/AgendaNotionTokens';
import {
  capitalizeFirst,
  dayLabel,
  dayRange,
  monthGridDays,
  monthRange,
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
  AgendaColumn,
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

const LEGEND_STATUSES = [
  'REQUESTED',
  'SCHEDULED',
  'CONFIRMED',
  'IN_SERVICE',
  'COMPLETED',
  'NO_SHOW',
] as const satisfies readonly AppointmentStatus[];

export function AgendaIndex() {
  const { tenant } = useAuth();
  const [viewMode, setViewMode] = useState<AgendaViewMode>('week');
  // No celular só cabem 2 colunas da semana: abre direto no dia.
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setViewMode('day');
  }, []);
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
  // Faltas ficam escondidas por padrão (poluem o dia); a legenda reativa.
  const [hiddenStatuses, setHiddenStatuses] = useState<ReadonlySet<string>>(
    () => new Set(['NO_SHOW']),
  );

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

  const days = useMemo(() => {
    if (viewMode === 'day') return [anchor];
    if (viewMode === 'month') return monthGridDays(anchor);
    return weekDays(anchor);
  }, [viewMode, anchor]);

  const { from, to } = useMemo(() => {
    if (viewMode === 'day') return dayRange(anchor);
    if (viewMode === 'month') return monthRange(anchor);
    return weekRange(anchor);
  }, [viewMode, anchor]);
  const { from: fromIso, to: toIso } = rangeIso(from, to);

  const effectiveResourceMode: AgendaResourceMode =
    chairsEnabled && resourceMode === 'chair' ? 'chair' : 'professional';
  // A semana mistura dias numa só grade: exige um profissional (Todos = 1º da lista).
  const allowAll = effectiveResourceMode === 'professional' && viewMode !== 'week';
  const isAll = allowAll && professionalId === AGENDA_ALL_PROFESSIONALS;
  const resolvedProfessionalId =
    professionalId === AGENDA_ALL_PROFESSIONALS && !isAll
      ? (professionals[0]?.id ?? '')
      : professionalId;
  const activeProfessionalId =
    effectiveResourceMode === 'professional' && !isAll ? resolvedProfessionalId : undefined;
  const activeChairId = effectiveResourceMode === 'chair' ? chairId : undefined;
  const resourceReady =
    isAll ||
    (effectiveResourceMode === 'professional'
      ? Boolean(resolvedProfessionalId)
      : Boolean(chairId));

  const listQuery = useAppointmentListHook({
    professionalId: activeProfessionalId,
    chairId: activeChairId,
    all: isAll,
    from: fromIso,
    to: toIso,
    enabled: resourceReady,
  });

  const update = useAppointmentUpdateHook({
    professionalId: activeProfessionalId,
    chairId: activeChairId,
    all: isAll,
    from: fromIso,
    to: toIso,
  });

  const rangeAppointments = (listQuery.data ?? []).filter((a) => a.status !== 'CANCELLED');
  const appointments = rangeAppointments.filter((a) => !hiddenStatuses.has(a.status));
  const statusCount = (status: string) =>
    rangeAppointments.filter((a) => a.status === status).length;
  const toggleStatus = (status: string) =>
    setHiddenStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });

  const columns: AgendaColumn[] =
    isAll && viewMode === 'day'
      ? professionals
          .filter((p) => p.active)
          .map((p) => ({
            key: p.id,
            label: p.name,
            day: anchor,
            professionalId: p.id,
            color: p.color,
          }))
      : days.map((day) => ({ key: toYmd(day), label: dayLabel(day), day }));

  const anchorLabel = (() => {
    if (viewMode === 'day') {
      return capitalizeFirst(format(anchor, "EEEE, d 'de' MMMM", { locale: ptBR }));
    }
    if (viewMode === 'month') {
      return capitalizeFirst(format(anchor, "MMMM 'de' yyyy", { locale: ptBR }));
    }
    return `${format(days[0]!, 'd MMM', { locale: ptBR })} – ${format(days[6]!, 'd MMM yyyy', { locale: ptBR })}`;
  })();

  const shift = (direction: 1 | -1) =>
    setAnchor((d) => {
      if (viewMode === 'month') return addMonths(d, direction);
      return addDays(d, (viewMode === 'day' ? 1 : 7) * direction);
    });

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

  const openCreate = (startsAt?: Date, endsAt?: Date, slotProfessionalId?: string) => {
    if (startsAt && endsAt) {
      setCreateSlot({
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        professionalId: slotProfessionalId,
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
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Agenda</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {chairsEnabled
              ? 'Consultas do dia e da semana · visão por profissional ou cadeira.'
              : 'Consultas do dia e da semana por profissional.'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={!tenantSlug}
            aria-label="Copiar link público"
            onClick={() => {
              void onCopyPublicBookingLink();
            }}
          >
            <LinkIcon />
            <span className="hidden sm:inline">Copiar link público</span>
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

      <Card className="min-h-[26rem] flex-1 gap-0 py-0">
        <CardHeader className="shrink-0 border-b border-border py-3">
          <AgendaToolbar
            viewMode={viewMode}
            onViewMode={setViewMode}
            anchorLabel={anchorLabel}
            onPrev={() => shift(-1)}
            onNext={() => shift(1)}
            onToday={() => setAnchor(new Date())}
            slotMinutes={slotMinutes}
            onSlotMinutes={setSlotMinutes}
            resourceMode={effectiveResourceMode}
            onResourceMode={setResourceMode}
            chairsEnabled={chairsEnabled}
            professionals={professionals}
            professionalId={isAll ? AGENDA_ALL_PROFESSIONALS : resolvedProfessionalId}
            allowAllProfessionals={allowAll}
            blockDisabled={isAll}
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
            <>
              {viewMode === 'month' ? (
                <AgendaMonthGrid
                  days={days}
                  anchor={anchor}
                  appointments={appointments}
                  showProfessional={isAll}
                  onOpenDay={(day) => {
                    setAnchor(day);
                    setViewMode('day');
                  }}
                  onOpenAppointment={setSelected}
                />
              ) : viewMode === 'list' ? (
                <AgendaListView
                  appointments={appointments}
                  showProfessional={isAll}
                  onOpenAppointment={setSelected}
                />
              ) : (
                <AgendaGrid
                  columns={columns}
                  appointments={appointments}
                  slotMinutes={slotMinutes}
                  scrollKey={`${viewMode}-${toYmd(anchor)}-${isAll}`}
                  showProfessional={effectiveResourceMode === 'chair'}
                  onSlotClick={openCreate}
                  onOpenAppointment={setSelected}
                  onMoveOrResize={(input) => {
                    void onMoveOrResize(input);
                  }}
                />
              )}
            </>
          )}

          {moveError ? (
            <Alert variant="destructive" className="mt-3 shrink-0" role="alert">
              <AlertDescription>{moveError}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="shrink-0 flex-wrap gap-2 border-border">
          {LEGEND_STATUSES.map((status) => {
            const meta = APPOINTMENT_STATUS_META[status];
            const hidden = hiddenStatuses.has(status);
            return (
              <button
                key={status}
                type="button"
                aria-pressed={!hidden}
                title={hidden ? `Mostrar ${meta.label}` : `Ocultar ${meta.label}`}
                className="cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => toggleStatus(status)}
              >
                <Badge
                  variant="outline"
                  className={cn(
                    meta.bg,
                    meta.text,
                    meta.border,
                    status === 'REQUESTED' && 'border-dashed',
                    hidden && 'opacity-40 line-through',
                  )}
                >
                  <span aria-hidden className={cn('size-1.5 rounded-full', meta.dot)} />
                  {meta.label} · {statusCount(status)}
                </Badge>
              </button>
            );
          })}
        </CardFooter>
      </Card>

      {waitlistOpen ? (
        <div className="flex max-h-[min(38%,22rem)] min-h-0 shrink-0 flex-col overflow-hidden">
          <WaitlistPanel professionalId={activeProfessionalId || undefined} />
        </div>
      ) : null}

      {createSlot ? (
        <AppointmentFormDialog
          open
          professionalId={
            createSlot.professionalId ??
            (activeProfessionalId ?? professionals[0]?.id)
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
          professionalId={activeProfessionalId ?? null}
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
