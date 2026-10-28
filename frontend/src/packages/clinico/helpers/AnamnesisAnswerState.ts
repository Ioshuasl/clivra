import type { AnamnesisQuestion } from '@/packages/clinico/types/Anamnesis/AnamnesisTypes';

export type AnswerValue = boolean | string | { value: boolean; text: string } | undefined;

const scalar = (raw: unknown): unknown =>
  raw && typeof raw === 'object' && 'value' in raw ? (raw).value : raw;

/** Mesma regra do servidor: pergunta com filtro por sexo só aparece para esse sexo. */
export function visibleQuestions(questions: AnamnesisQuestion[], patientSex?: string | null) {
  return questions.filter((question) => {
    const gender = question.showWhen?.patientGender;
    return !gender || patientSex?.trim().toUpperCase() === gender.trim().toUpperCase();
  });
}

/** Parte das respostas da última anamnese do paciente (só perguntas que ainda existem no modelo). */
export function initialAnswers(
  questions: AnamnesisQuestion[],
  previous: Record<string, unknown> | undefined,
): Record<string, AnswerValue> {
  const state: Record<string, AnswerValue> = {};
  if (!previous) return state;
  for (const question of questions) {
    const raw = previous[question.id];
    if (raw === undefined || raw === null) continue;
    const value = scalar(raw);
    if (question.type === 'BOOLEAN' && typeof value === 'boolean') state[question.id] = value;
    if (question.type === 'BOOLEAN_WITH_TEXT' && typeof value === 'boolean') {
      const text = (raw as { text?: unknown }).text;
      state[question.id] = { value, text: typeof text === 'string' ? text : '' };
    }
    if (question.type === 'SINGLE_CHOICE' && typeof value === 'string' && question.options?.includes(value)) {
      state[question.id] = value;
    }
    if (question.type === 'TEXT' && typeof raw === 'string') state[question.id] = raw;
  }
  return state;
}

export function isAnswered(question: AnamnesisQuestion, value: AnswerValue): boolean {
  if (value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function toAnswersPayload(
  questions: AnamnesisQuestion[],
  state: Record<string, AnswerValue>,
): Record<string, unknown> {
  const answers: Record<string, unknown> = {};
  for (const question of questions) {
    const value = state[question.id];
    if (!isAnswered(question, value)) continue;
    if (question.type === 'BOOLEAN_WITH_TEXT' && typeof value === 'object') {
      const text = value.text.trim();
      answers[question.id] = value.value && text ? { value: true, text } : { value: value.value };
    } else {
      answers[question.id] = value;
    }
  }
  return answers;
}
