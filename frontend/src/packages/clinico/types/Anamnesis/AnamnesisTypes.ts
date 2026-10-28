export type AnamnesisQuestionType = 'BOOLEAN' | 'BOOLEAN_WITH_TEXT' | 'SINGLE_CHOICE' | 'TEXT';

export type AnamnesisQuestion = {
  id: string;
  label: string;
  type: AnamnesisQuestionType;
  required?: boolean;
  options?: string[];
  showWhen?: { patientGender?: string };
};

export type AnamnesisFormModel = {
  id: string;
  name: string;
  version: number;
  questions: AnamnesisQuestion[];
};

export type AnamnesisResponseSummary = {
  id: string;
  formId: string;
  formName: string;
  answers: Record<string, unknown>;
  answeredAt: string;
};

export type AnamnesisCreateInput = {
  answers: Record<string, unknown>;
  professionalId?: string;
};
