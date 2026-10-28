import type { AttendancePatient } from '@/packages/clinico/types/Patient/PatientTypes';

export type PatientEditFormDialogProps = {
  patient: AttendancePatient;
  onClose: () => void;
};
