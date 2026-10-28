import { z } from 'zod';
import { ALERT_CATEGORIES } from '@/packages/admin/enum/AnamnesisForm/AlertCategoryEnum';
import { ALERT_SEVERITIES } from '@/packages/admin/enum/AnamnesisForm/AlertSeverityEnum';
import { QUESTION_TYPES } from '@/packages/admin/enum/AnamnesisForm/QuestionTypeEnum';
import type {
  AnamnesisFormSummary,
  AnamnesisQuestion,
} from '@/packages/admin/types/AnamnesisForm/AnamnesisFormTypes';

export const AnamnesisFormQuestionSchema = z
  .object({
    id: z.string().min(1).max(80),
    label: z.string().trim().min(1, 'Escreva a pergunta').max(500, 'Pergunta muito longa'),
    type: z.enum(QUESTION_TYPES),
    required: z.boolean(),
    options: z.array(z.string()),
    alertMode: z.enum(['none', 'equals', 'notEquals']),
    alertValue: z.string().optional(),
    alertSeverity: z.enum(ALERT_SEVERITIES),
    alertCategory: z.enum(ALERT_CATEGORIES),
    showWhenGender: z.string().optional(),
  })
  .superRefine((question, ctx) => {
    if (question.type !== 'SINGLE_CHOICE') return;
    if (question.options.filter((option) => option.trim()).length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Informe pelo menos 2 opções de resposta',
      });
    }
  });

export const AnamnesisFormCreateSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome ao formulário').max(120, 'Nome muito longo'),
  questions: z.array(AnamnesisFormQuestionSchema).min(1, 'Adicione pelo menos uma pergunta'),
});

export type AnamnesisFormQuestionFormValues = z.infer<typeof AnamnesisFormQuestionSchema>;
export type AnamnesisFormCreateFormValues = z.infer<typeof AnamnesisFormCreateSchema>;

/** Id interno estável da pergunta (as respostas dos pacientes apontam para ele). */
function newQuestionId(): string {
  return `q_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newAnamnesisQuestion(
  overrides: Partial<AnamnesisFormQuestionFormValues> = {},
): AnamnesisFormQuestionFormValues {
  return {
    id: newQuestionId(),
    label: '',
    type: 'BOOLEAN',
    required: false,
    options: [],
    alertMode: 'none',
    alertValue: '',
    alertSeverity: 'WARNING',
    alertCategory: 'OTHER',
    showWhenGender: '',
    ...overrides,
  };
}

export function anamnesisFormToFormValues(
  form: AnamnesisFormSummary,
): AnamnesisFormCreateFormValues {
  return {
    name: form.name,
    questions: form.questions.map((question) => {
      const equals = question.alertWhen && 'equals' in question.alertWhen;
      const notEquals = question.alertWhen && 'notEquals' in question.alertWhen;
      return {
        id: question.id,
        label: question.label,
        type: question.type,
        required: question.required ?? false,
        options: question.options ?? [],
        alertMode: equals ? 'equals' : notEquals ? 'notEquals' : 'none',
        alertValue: equals
          ? String(question.alertWhen?.equals)
          : notEquals
            ? String(question.alertWhen?.notEquals)
            : '',
        alertSeverity: question.alertSeverity ?? 'WARNING',
        alertCategory: question.alertCategory ?? 'OTHER',
        // Regra por sexo foi aposentada: ao editar, a pergunta passa a valer para todos.
        showWhenGender: '',
      };
    }),
  };
}

function parseAlertValue(raw: string | undefined): unknown {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return trimmed;
}

export function toAnamnesisFormQuestions(
  questions: AnamnesisFormQuestionFormValues[],
): AnamnesisQuestion[] {
  return questions.map((question) => {
    const options =
      question.type === 'SINGLE_CHOICE'
        ? question.options.map((item) => item.trim()).filter(Boolean)
        : undefined;
    const alertValue = parseAlertValue(question.alertValue);
    const alertWhen =
      question.type === 'TEXT' || alertValue === undefined
        ? undefined
        : question.alertMode === 'equals'
          ? { equals: alertValue }
          : question.alertMode === 'notEquals'
            ? { notEquals: alertValue }
            : undefined;

    return {
      id: question.id.trim(),
      label: question.label.trim(),
      type: question.type,
      required: question.required || undefined,
      options: options?.length ? options : undefined,
      alertWhen,
      alertSeverity: alertWhen ? question.alertSeverity : undefined,
      alertCategory: alertWhen ? question.alertCategory : undefined,
      showWhen: question.showWhenGender?.trim()
        ? { patientGender: question.showWhenGender.trim() }
        : undefined,
    };
  });
}
