export const QUESTION_TYPES = ['BOOLEAN', 'BOOLEAN_WITH_TEXT', 'SINGLE_CHOICE', 'TEXT'] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Nome do tipo de resposta, em linguagem do dia a dia. */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  BOOLEAN: 'Sim ou não',
  BOOLEAN_WITH_TEXT: 'Sim ou não, com detalhes',
  SINGLE_CHOICE: 'Escolher uma opção',
  TEXT: 'Resposta escrita',
};
