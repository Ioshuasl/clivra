import type { AttendancePatient } from '@/packages/clinico/types/Patient/PatientTypes';

export type AnamnesisUpdateFormDialogProps = {
  patient: AttendancePatient;
  professionalId: string;
  onClose: () => void;
};
