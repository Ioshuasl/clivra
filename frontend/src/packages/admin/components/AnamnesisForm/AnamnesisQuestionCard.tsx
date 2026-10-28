'use client';

import { useRef } from 'react';
import {
  BellRingIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import {
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  type QuestionType,
} from '@/packages/admin/enum/AnamnesisForm/QuestionTypeEnum';
import type { AnamnesisFormQuestionFormValues } from '@/packages/admin/schemas/AnamnesisForm/AnamnesisFormSchema';
import type { AnamnesisQuestionCardProps } from '@/packages/admin/types/AnamnesisForm/AnamnesisQuestionCardTypes';
import { cn } from '@/shared/helpers/utils';
import { Button } from '@/shared/ui/button';
import { Field, FieldError, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { Switch } from '@/shared/ui/switch';

function isYesNo(type: QuestionType): boolean {
  return type === 'BOOLEAN' || type === 'BOOLEAN_WITH_TEXT';
}

/** Prévia desabilitada de como o paciente vai responder. */
function AnswerPreview({ type }: { type: QuestionType }) {
  if (type === 'TEXT') {
    return (
      <div className="border-b border-dashed border-border pb-1 text-sm text-muted-foreground">
        Resposta escrita pelo paciente
      </div>
    );
  }
  if (!isYesNo(type)) return null;
  return (
    <div className="grid gap-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-5">
        {['Sim', 'Não'].map((item) => (
          <span key={item} className="flex items-center gap-2">
            <span aria-hidden className="size-4 rounded-full border border-muted-foreground/50" />
            {item}
          </span>
        ))}
      </div>
      {type === 'BOOLEAN_WITH_TEXT' ? (
        <div className="border-b border-dashed border-border pb-1">
          Se sim, o paciente explica aqui
        </div>
      ) : null}
    </div>
  );
}

export function AnamnesisQuestionCard({
  form,
  index,
  total,
  active,
  onActivate,
  onMove,
  onDuplicate,
  onRemove,
}: AnamnesisQuestionCardProps) {
  const question = form.watch(`questions.${index}`);
  const errors = form.formState.errors.questions?.[index];
  const optionsRef = useRef<HTMLDivElement>(null);
  const submitted = form.formState.isSubmitted;
  const highlighted = question.alertMode !== 'none';

  const setField = <K extends keyof AnamnesisFormQuestionFormValues>(
    key: K,
    value: AnamnesisFormQuestionFormValues[K],
  ) => {
    form.setValue(`questions.${index}.${key}` as `questions.${number}.label`, value as never, {
      shouldDirty: true,
      shouldValidate: submitted,
    });
  };

  const setType = (type: QuestionType) => {
    setField('type', type);
    setField('alertMode', 'none');
    setField('alertValue', '');
    if (type === 'SINGLE_CHOICE' && question.options.length < 2) setField('options', ['', '']);
  };

  const setHighlight = (on: boolean) => {
    setField('alertMode', on ? 'equals' : 'none');
    setField('alertValue', on ? 'true' : '');
  };

  const setOptions = (options: string[]) => setField('options', options);

  const addOption = () => {
    setOptions([...question.options, '']);
    requestAnimationFrame(() => {
      const inputs = optionsRef.current?.querySelectorAll('input');
      inputs?.[inputs.length - 1]?.focus();
    });
  };

  if (!active) {
    return (
      <button
        type="button"
        onClick={onActivate}
        aria-label={`Editar pergunta ${index + 1}`}
        className={cn(
          'flex w-full cursor-pointer items-start gap-3 rounded-2xl border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40',
          errors ? 'border-destructive' : 'border-border',
        )}
      >
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-sm font-medium',
              question.label ? 'text-foreground' : 'italic text-muted-foreground',
            )}
          >
            {question.label || 'Pergunta sem título'}
            {question.required ? <span className="text-destructive"> *</span> : null}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span>{QUESTION_TYPE_LABELS[question.type]}</span>
            {highlighted ? (
              <span className="inline-flex items-center gap-1 text-warning">
                <BellRingIcon className="size-3" aria-hidden />
                Destacada no atendimento
              </span>
            ) : null}
            {errors ? <span className="text-destructive">Precisa de ajuste</span> : null}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label={`Pergunta ${index + 1}`}
      className="grid gap-4 rounded-2xl border border-l-4 border-border border-l-primary bg-card p-4 shadow-md"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
        <Field data-invalid={Boolean(errors?.label)}>
          <FieldLabel htmlFor={`q-${index}-label`} className="sr-only">
            Pergunta {index + 1}
          </FieldLabel>
          <Input
            id={`q-${index}-label`}
            autoFocus={!question.label}
            placeholder="Escreva a pergunta, ex.: Tem alergia a algum remédio?"
            className="h-11 text-base"
            {...form.register(`questions.${index}.label`)}
          />
          <FieldError>{errors?.label?.message}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor={`q-${index}-type`} className="sr-only">
            Como o paciente responde
          </FieldLabel>
          <NativeSelect
            id={`q-${index}-type`}
            value={question.type}
            className="h-11 w-full"
            onChange={(event) => setType(event.target.value as QuestionType)}
          >
            {QUESTION_TYPES.map((item) => (
              <NativeSelectOption key={item} value={item}>
                {QUESTION_TYPE_LABELS[item]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>

      {question.type === 'SINGLE_CHOICE' ? (
        <Field data-invalid={Boolean(errors?.options)}>
          <div ref={optionsRef} className="grid gap-2">
            {question.options.map((option, optionIndex) => (
              <div key={optionIndex} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-4 shrink-0 rounded-full border border-muted-foreground/50"
                />
                <Input
                  value={option}
                  aria-label={`Opção ${optionIndex + 1}`}
                  placeholder={`Opção ${optionIndex + 1}`}
                  className="h-9"
                  onChange={(event) =>
                    setOptions(
                      question.options.map((item, i) =>
                        i === optionIndex ? event.target.value : item,
                      ),
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addOption();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="cursor-pointer"
                  aria-label={`Remover opção ${optionIndex + 1}`}
                  disabled={question.options.length <= 2}
                  onClick={() => setOptions(question.options.filter((_, i) => i !== optionIndex))}
                >
                  <XIcon />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit cursor-pointer text-primary"
              onClick={addOption}
            >
              <PlusIcon />
              Adicionar opção
            </Button>
          </div>
          <FieldError>{errors?.options?.message}</FieldError>
        </Field>
      ) : (
        <AnswerPreview type={question.type} />
      )}

      <div className="grid gap-3 border-t border-border pt-3">
        {isYesNo(question.type) ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Switch
              checked={highlighted}
              aria-label="Destacar no atendimento quando a resposta for Sim"
              onCheckedChange={(checked) => setHighlight(checked === true)}
            />
            Destacar no atendimento quando a resposta for “Sim”
          </label>
        ) : highlighted ? (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <BellRingIcon className="size-3" aria-hidden />
            Esta pergunta já tinha um destaque configurado; ele continua valendo.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer"
              aria-label="Mover pergunta para cima"
              title="Mover para cima"
              disabled={index === 0}
              onClick={() => onMove(-1)}
            >
              <ChevronUpIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer"
              aria-label="Mover pergunta para baixo"
              title="Mover para baixo"
              disabled={index === total - 1}
              onClick={() => onMove(1)}
            >
              <ChevronDownIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer"
              aria-label="Duplicar pergunta"
              title="Duplicar"
              onClick={onDuplicate}
            >
              <CopyIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer text-destructive hover:text-destructive"
              aria-label="Excluir pergunta"
              title="Excluir"
              disabled={total <= 1}
              onClick={onRemove}
            >
              <Trash2Icon />
            </Button>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Switch
              checked={question.required}
              aria-label="Resposta obrigatória"
              onCheckedChange={(checked) => setField('required', checked === true)}
            />
            Resposta obrigatória
          </label>
        </div>
      </div>
    </div>
  );
}
