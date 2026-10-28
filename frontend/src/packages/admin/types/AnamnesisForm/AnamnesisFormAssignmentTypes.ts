export type AnamnesisFormAssignment = {
  professionalId: string;
  formName: string;
};

export type AnamnesisFormAssignmentSetInput = {
  professionalId: string;
  /** Nulo = volta ao modelo geral da clínica. */
  formName: string | null;
};
