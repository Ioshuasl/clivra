import { BellRingIcon } from 'lucide-react';
import { QUESTION_TYPE_LABELS } from '@/packages/admin/enum/AnamnesisForm/QuestionTypeEnum';
import type { AnamnesisQuestion } from '@/packages/admin/types/AnamnesisForm/AnamnesisFormTypes';

function answerLabel(value: unknown): string {
  if (value === true) return 'Sim';
  if (value === false) return 'Não';
  return String(value);
}

function alertText(question: AnamnesisQuestion): string | null {
  const when = question.alertWhen;
  if (!when) return null;
  if (when.equals !== undefined) return `Avisa quando for “${answerLabel(when.equals)}”`;
  if (when.notEquals !== undefined) return `Avisa quando não for “${answerLabel(when.notEquals)}”`;
  return null;
}

function genderText(gender: string): string {
  if (gender.toUpperCase() === 'F') return 'só para mulheres';
  if (gender.toUpperCase() === 'M') return 'só para homens';
  return `só sexo ${gender}`;
}

/** Leitura do formulário como o paciente vai ver: perguntas numeradas, com as regras em palavras simples. */
export function AnamnesisFormPreview({ questions }: { questions: AnamnesisQuestion[] }) {
  return (
    <ol className="grid gap-2">
      {questions.map((question, index) => {
        const alert = alertText(question);
        return (
          <li
            key={question.id}
            className="flex items-start gap-3 rounded-xl bg-muted/40 px-3 py-2.5"
          >
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-semibold text-muted-foreground">
              {index + 1}
            </span>
            <div className="min-w-0 text-sm">
              <p className="font-medium text-foreground">
                {question.label}
                {question.required ? <span className="text-destructive"> *</span> : null}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span>{QUESTION_TYPE_LABELS[question.type]}</span>
                {question.options?.length ? <span>· {question.options.join(' / ')}</span> : null}
                {question.showWhen?.patientGender ? (
                  <span>· {genderText(question.showWhen.patientGender)}</span>
                ) : null}
                {alert ? (
                  <span className="inline-flex items-center gap-1 text-warning">
                    <BellRingIcon className="size-3" aria-hidden />
                    {alert}
                  </span>
                ) : null}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
