import { AppointmentStatusData } from '@/packages/clinico/data/Appointment/AppointmentStatusData';
import type { AppointmentStatusInput } from '@/packages/clinico/types/Appointment/AppointmentTypes';

export async function AppointmentStatusService(
  appointmentId: string,
  statusSchema: AppointmentStatusInput,
) {
  return AppointmentStatusData(appointmentId, statusSchema);
}
