'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ALERT_CATEGORY_LABELS } from '@/packages/clinico/enum/ClinicalAlert/AlertCategoryEnum';
import { ALERT_SEVERITY_LABELS } from '@/packages/clinico/enum/ClinicalAlert/AlertSeverityEnum';
import { maskPhone } from '@/packages/clinico/helpers/PatientMask';
import { useAppointmentStatusHook } from '@/packages/clinico/hooks/Appointment/useAppointmentStatusHook';
import type { AttendanceAppointment } from '@/packages/clinico/types/Appointment/AppointmentTypes';
import type { AttendancePatient } from '@/packages/clinico/types/Patient/PatientTypes';
import type { ClinicalAlertSummary } from '@/packages/clinico/types/MedicalRecord/MedicalRecordTypes';
import { Can } from '@/shared/auth/Can';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

const PatientEditFormDialog = dynamic(
  () =>
    import('@/packages/clinico/components/Patient/PatientEditFormDialog').then(
      (m) => m.PatientEditFormDialog,
    ),
  { ssr: false },
);

const AnamnesisViewDialog = dynamic(
  () =>
    import('@/packages/clinico/components/Anamnesis/AnamnesisViewDialog').then(
      (m) => m.AnamnesisViewDialog,
    ),
  { ssr: false },
);

const AnamnesisUpdateFormDialog = dynamic(
  () =>
    import('@/packages/clinico/components/Anamnesis/AnamnesisUpdateFormDialog').then(
      (m) => m.AnamnesisUpdateFormDialog,
    ),
  { ssr: false },
);

type AttendanceHeaderProps = {
  appointment: AttendanceAppointment;
  patient?: AttendancePatient;
  patientName: string;
  age: number | null;
  anamnesisStale?: boolean;
  alerts: ClinicalAlertSummary[];
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmado',
  SCHEDULED: 'Agendado',
  IN_SERVICE: 'Em atendimento',
  COMPLETED: 'Concluído',
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function AttendanceHeader({
  appointment,
  patient,
  patientName,
  age,
  anamnesisStale,
  alerts,
}: AttendanceHeaderProps) {
  const router = useRouter();
  const status = useAppointmentStatusHook(appointment.id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [anamnesisView, setAnamnesisView] = useState<'closed' | 'view' | 'update'>('closed');
  const active = alerts.filter((alert) => alert.active);
  const critical = active.filter((alert) => alert.severity === 'CRITICAL');
  const warning = active.filter((alert) => alert.severity === 'WARNING');
  const completed = appointment.status === 'COMPLETED';
  const details = [
    `${formatTime(appointment.startsAt)}–${formatTime(appointment.endsAt)}`,
    appointment.procedure?.name,
    maskPhone(appointment.patient?.phonePrimary) || null,
  ].filter(Boolean);

  const onComplete = async () => {
    await status.mutateAsync({ status: 'COMPLETED' });
    router.push('/app/agenda');
  };

  return (
    <header className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">
              {patientName}
              {age != null ? ` · ${age} anos` : ''}
            </h1>
            <Badge variant="outline">{STATUS_LABELS[appointment.status] ?? appointment.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{details.join(' · ')}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Link
              href={`/app/pacientes/${appointment.patientId}`}
              className="text-sm font-medium text-primary underline underline-offset-4 hover:no-underline"
            >
              Ver ficha completa
            </Link>
            {patient ? (
              <>
                <Can permission="patients.write">
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                    Editar cadastro
                  </Button>
                </Can>
                <Button type="button" size="sm" variant="outline" onClick={() => setAnamnesisView('view')}>
                  Ver anamnese
                </Button>
              </>
            ) : null}
          </div>
        </div>
        <Can permission="clinical_records.write">
          {completed ? null : (
            <Button type="button" onClick={() => setConfirmOpen(true)}>
              Concluir atendimento
            </Button>
          )}
        </Can>
      </div>

      {anamnesisStale ? (
        <Alert>
          <AlertTitle>Anamnese desatualizada</AlertTitle>
          <AlertDescription>
            Sem resposta nos últimos 12 meses. Vale confirmar alergias e medicamentos com o paciente.
          </AlertDescription>
        </Alert>
      ) : null}

      {critical.map((alert) => (
        <Alert key={alert.id} variant="destructive">
          <AlertTitle>
            Atenção ·{' '}
            {ALERT_CATEGORY_LABELS[alert.category as keyof typeof ALERT_CATEGORY_LABELS] ?? alert.category}
          </AlertTitle>
          <AlertDescription>{alert.description}</AlertDescription>
        </Alert>
      ))}

      {warning.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {warning.map((alert) => (
            <Badge key={alert.id} variant="outline">
              {ALERT_SEVERITY_LABELS[alert.severity as keyof typeof ALERT_SEVERITY_LABELS] ?? alert.severity}
              {': '}
              {alert.description}
            </Badge>
          ))}
        </div>
      ) : null}

      {editOpen && patient ? (
        <PatientEditFormDialog patient={patient} onClose={() => setEditOpen(false)} />
      ) : null}

      {anamnesisView === 'view' && patient ? (
        <AnamnesisViewDialog
          patient={patient}
          professionalId={appointment.professionalId}
          onClose={() => setAnamnesisView('closed')}
          onUpdate={() => setAnamnesisView('update')}
        />
      ) : null}

      {anamnesisView === 'update' && patient ? (
        <AnamnesisUpdateFormDialog
          patient={patient}
          professionalId={appointment.professionalId}
          onClose={() => setAnamnesisView('closed')}
        />
      ) : null}

      {confirmOpen ? (
        <AlertDialog
          open
          onOpenChange={(open) => (!open && !status.isPending ? setConfirmOpen(false) : undefined)}
        >
          <AlertDialogContent size="default" className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Concluir o atendimento de {patientName}?</AlertDialogTitle>
              <AlertDialogDescription>
                Confirme que já registrou a evolução e os procedimentos realizados. Você volta para a agenda.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {status.isError ? (
              <p className="text-sm text-destructive">Não foi possível concluir. Tente novamente.</p>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer" disabled={status.isPending}>
                Continuar atendendo
              </AlertDialogCancel>
              <Button
                type="button"
                className="cursor-pointer"
                disabled={status.isPending}
                onClick={() => {
                  void onComplete();
                }}
              >
                {status.isPending ? 'Concluindo…' : 'Concluir atendimento'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </header>
  );
}
