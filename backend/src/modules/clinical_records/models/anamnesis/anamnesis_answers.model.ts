import { QUESTION_TYPES, type QuestionType } from '../../enum/anamnesis/question_type.enum.js';
import type {
  AnamnesisAlertWhen,
  AnamnesisAnswers,
  AnamnesisQuestion,
} from '../../types/anamnesis/anamnesis_question.types.js';
import type { AlertCategory } from '../../enum/clinical_alert/alert_category.enum.js';
import type { AlertSeverity } from '../../enum/clinical_alert/alert_severity.enum.js';

export type GeneratedAlert = {
  severity: AlertSeverity;
  category: AlertCategory;
  description: string;
};

export type AnswerValidationIssue = {
  questionId: string;
  reason: string;
};

function isQuestionType(value: string): value is QuestionType {
  return (QUESTION_TYPES as readonly string[]).includes(value);
}

export function parseQuestions(raw: unknown): AnamnesisQuestion[] {
  if (!Array.isArray(raw)) return [];
  const questions: AnamnesisQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.label !== 'string' || typeof row.type !== 'string') {
      continue;
    }
    if (!isQuestionType(row.type)) continue;
    questions.push({
      id: row.id,
      label: row.label,
      type: row.type,
      required: row.required === true,
      options: Array.isArray(row.options)
        ? row.options.filter((o): o is string => typeof o === 'string')
        : undefined,
      alertWhen:
        row.alertWhen && typeof row.alertWhen === 'object'
          ? (row.alertWhen)
          : undefined,
      alertSeverity:
        row.alertSeverity === 'INFO' || row.alertSeverity === 'WARNING' || row.alertSeverity === 'CRITICAL'
          ? row.alertSeverity
          : undefined,
      alertCategory:
        row.alertCategory === 'ALLERGY' ||
        row.alertCategory === 'CONDITION' ||
        row.alertCategory === 'MEDICATION' ||
        row.alertCategory === 'OTHER'
          ? row.alertCategory
          : undefined,
      showWhen:
        row.showWhen && typeof row.showWhen === 'object'
          ? (row.showWhen)
          : undefined,
    });
  }
  return questions;
}

export function matchesPatientGender(patientSex: string | null | undefined, required: string): boolean {
  if (!patientSex) return false;
  return patientSex.trim().toUpperCase() === required.trim().toUpperCase();
}

export function visibleQuestions(
  questions: AnamnesisQuestion[],
  patientSex: string | null | undefined,
): AnamnesisQuestion[] {
  return questions.filter((q) => {
    const gender = q.showWhen?.patientGender;
    if (!gender) return true;
    return matchesPatientGender(patientSex, gender);
  });
}

export function answerScalar(answer: unknown): unknown {
  if (answer && typeof answer === 'object' && 'value' in answer) {
    return (answer).value;
  }
  return answer;
}

export function answerText(answer: unknown): string | undefined {
  if (answer && typeof answer === 'object' && 'text' in answer) {
    const text = (answer as { text?: unknown }).text;
    return typeof text === 'string' ? text : undefined;
  }
  return undefined;
}

export function validateAnswers(
  questions: AnamnesisQuestion[],
  answers: AnamnesisAnswers,
): AnswerValidationIssue[] {
  const issues: AnswerValidationIssue[] = [];
  const known = new Set(questions.map((q) => q.id));

  for (const question of questions) {
    const answer = answers[question.id];
    if (answer === undefined || answer === null) {
      if (question.required) {
        issues.push({ questionId: question.id, reason: 'required' });
      }
      continue;
    }

    if (question.type === 'BOOLEAN') {
      const value = answerScalar(answer);
      if (typeof value !== 'boolean') {
        issues.push({ questionId: question.id, reason: 'type' });
      }
      continue;
    }

    if (question.type === 'BOOLEAN_WITH_TEXT') {
      const value = answerScalar(answer);
      if (typeof value !== 'boolean') {
        issues.push({ questionId: question.id, reason: 'type' });
      }
      continue;
    }

    if (question.type === 'SINGLE_CHOICE') {
      const value = answerScalar(answer);
      if (typeof value !== 'string' || value.trim().length === 0) {
        issues.push({ questionId: question.id, reason: 'type' });
        continue;
      }
      if (question.options && question.options.length > 0 && !question.options.includes(value)) {
        issues.push({ questionId: question.id, reason: 'option' });
      }
      continue;
    }

    if (question.type === 'TEXT') {
      const value = typeof answer === 'string' ? answer : answerScalar(answer);
      if (typeof value !== 'string' || (question.required && value.trim().length === 0)) {
        issues.push({ questionId: question.id, reason: question.required ? 'required' : 'type' });
      }
    }
  }

  for (const key of Object.keys(answers)) {
    if (!known.has(key)) {
      issues.push({ questionId: key, reason: 'unknown' });
    }
  }

  return issues;
}

export function matchesAlertWhen(alertWhen: AnamnesisAlertWhen, value: unknown): boolean {
  if (Object.prototype.hasOwnProperty.call(alertWhen, 'equals')) {
    return value === alertWhen.equals;
  }
  if (Object.prototype.hasOwnProperty.call(alertWhen, 'notEquals')) {
    return value !== alertWhen.notEquals;
  }
  return false;
}

export function evaluateAlerts(
  questions: AnamnesisQuestion[],
  answers: AnamnesisAnswers,
): GeneratedAlert[] {
  const alerts: GeneratedAlert[] = [];
  for (const question of questions) {
    if (!question.alertWhen) continue;
    const answer = answers[question.id];
    if (answer === undefined || answer === null) continue;
    const value = answerScalar(answer);
    if (!matchesAlertWhen(question.alertWhen, value)) continue;

    const extra = answerText(answer)?.trim();
    const description = extra ? `${question.label} ${extra}` : question.label;
    alerts.push({
      severity: question.alertSeverity ?? 'WARNING',
      category: question.alertCategory ?? 'OTHER',
      description,
    });
  }
  return alerts;
}

export function canonicalAnswers(answers: AnamnesisAnswers): string {
  const keys = Object.keys(answers).sort();
  const ordered: AnamnesisAnswers = {};
  for (const key of keys) {
    ordered[key] = answers[key];
  }
  return JSON.stringify(ordered);
}
