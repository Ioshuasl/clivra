import { apiClient } from '@/shared/api/api-client';
import type {
  AppointmentStatusInput,
  AttendanceAppointment,
} from '@/packages/clinico/types/Appointment/AppointmentTypes';

export async function AppointmentStatusData(
  appointmentId: string,
  statusSchema: AppointmentStatusInput,
): Promise<AttendanceAppointment> {
  return apiClient.request<AttendanceAppointment>(
    `/appointments/${encodeURIComponent(appointmentId)}/status`,
    { method: 'POST', body: JSON.stringify(statusSchema) },
  );
}
