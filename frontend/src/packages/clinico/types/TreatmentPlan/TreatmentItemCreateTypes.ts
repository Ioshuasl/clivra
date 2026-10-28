export type TreatmentItemCreateInput = {
  patientId: string;
  procedureId: string;
  toothCode?: string | null;
  face?: string | null;
};

export type TreatmentItemCreateResult = {
  planId: string;
  itemId: string;
};

export type TreatmentItemCreateFormDialogProps = {
  patientId: string;
  onClose: () => void;
};
