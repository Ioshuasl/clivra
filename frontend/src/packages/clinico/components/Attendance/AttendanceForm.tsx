'use client';

import { AttendanceHeader } from '@/packages/clinico/components/Attendance/AttendanceHeader';
import { TreatmentPlanPanel } from '@/packages/clinico/components/TreatmentPlan/TreatmentPlanPanel';
import { AttachmentPanel } from '@/packages/clinico/components/Attachment/AttachmentPanel';
import { ClinicalNoteEditor } from '@/packages/clinico/components/ClinicalNote/ClinicalNoteEditor';
import { ClinicalNoteHistory } from '@/packages/clinico/components/ClinicalNote/ClinicalNoteHistory';
import { OdontogramPanel } from '@/packages/clinico/components/Odontogram/OdontogramPanel';
import { clinicoErrorMessage } from '@/packages/clinico/helpers/ClinicoErrorMessage';
import { ageFromBirthDate } from '@/packages/clinico/helpers/PatientAge';
import { useAppointmentGetHook } from '@/packages/clinico/hooks/Appointment/useAppointmentGetHook';
import { useMedicalRecordGetHook } from '@/packages/clinico/hooks/MedicalRecord/useMedicalRecordGetHook';
import { usePatientGetHook } from '@/packages/clinico/hooks/Patient/usePatientGetHook';
import type { AttendanceFormProps } from '@/packages/clinico/types/Attendance/AttendanceFormTypes';
import { ApiClientError } from '@/shared/api/api-client';
import { Can } from '@/shared/auth/Can';
import { Alert, AlertDescription } from '@/shared/ui/alert';

export function AttendanceForm({ appointmentId }: AttendanceFormProps) {
  const appointmentQuery = useAppointmentGetHook(appointmentId);
  const patientId = appointmentQuery.data?.patientId;
  const patientQuery = usePatientGetHook(patientId);
  const recordQuery = useMedicalRecordGetHook(patientId);

  if (appointmentQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando atendimento…</p>;
  }

  if (appointmentQuery.isError || !appointmentQuery.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{clinicoErrorMessage(appointmentQuery.error)}</AlertDescription>
      </Alert>
    );
  }

  if (recordQuery.isError) {
    const forbidden = recordQuery.error instanceof ApiClientError && recordQuery.error.status === 403;
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {forbidden
            ? 'Você não tem permissão para acessar o prontuário.'
            : clinicoErrorMessage(recordQuery.error)}
        </AlertDescription>
      </Alert>
    );
  }

  if (!patientId || recordQuery.isLoading || !recordQuery.data) {
    return <p className="text-sm text-muted-foreground">Carregando prontuário…</p>;
  }

  const appointment = appointmentQuery.data;
  const patientName =
    patientQuery.data?.socialName ||
    patientQuery.data?.name ||
    appointment.patient?.name ||
    'Paciente';
  const age = ageFromBirthDate(patientQuery.data?.birthDate);

  return (
    <div className="grid gap-6">
      <AttendanceHeader
        appointment={appointment}
        patient={patientQuery.data}
        patientName={patientName}
        age={age}
        anamnesisStale={recordQuery.data.anamnesisStale}
        alerts={recordQuery.data.alerts}
      />

      <div className="flex flex-col gap-4 xl:flex-row">
        <main className="min-w-0 max-w-4xl flex-1">
          <OdontogramPanel patientId={patientId} />
        </main>
        <aside className="w-full shrink-0 xl:w-[360px]">
          <div className="sticky top-4 grid gap-4">
            <Can permission="quotes.read">
              <TreatmentPlanPanel patientId={patientId} appointmentId={appointment.id} />
            </Can>
            <ClinicalNoteEditor patientId={patientId} appointmentId={appointment.id} />
          </div>
        </aside>
      </div>

      <section className="grid gap-4">
        <ClinicalNoteHistory patientId={patientId} />
        <AttachmentPanel patientId={patientId} />
      </section>
    </div>
  );
}
