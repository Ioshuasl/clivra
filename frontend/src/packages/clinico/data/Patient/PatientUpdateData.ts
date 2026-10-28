import { apiClient } from '@/shared/api/api-client';
import type {
  AttendancePatient,
  AttendancePatientUpdateInput,
} from '@/packages/clinico/types/Patient/PatientTypes';

export async function PatientUpdateData(
  patientId: string,
  patientSchema: AttendancePatientUpdateInput,
): Promise<AttendancePatient> {
  return apiClient.request<AttendancePatient>(`/patients/${encodeURIComponent(patientId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patientSchema),
  });
}
