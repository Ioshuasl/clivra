import type { AttendancePatient } from '@/packages/clinico/types/Patient/PatientTypes';

export type AnamnesisViewDialogProps = {
  patient: AttendancePatient;
  professionalId: string;
  onClose: () => void;
  /** Fecha a ficha e abre a atualização (só para quem pode editar). */
  onUpdate: () => void;
};
