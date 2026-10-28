import { PatientUpdateData } from '@/packages/clinico/data/Patient/PatientUpdateData';
import type { AttendancePatientUpdateInput } from '@/packages/clinico/types/Patient/PatientTypes';

export async function PatientUpdateService(
  patientId: string,
  patientSchema: AttendancePatientUpdateInput,
) {
  return PatientUpdateData(patientId, patientSchema);
}
