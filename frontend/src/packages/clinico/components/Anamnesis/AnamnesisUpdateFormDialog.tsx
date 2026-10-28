'use client';

import { useEffect, useState } from 'react';
import {
  initialAnswers,
  isAnswered,
  toAnswersPayload,
  visibleQuestions,
  type AnswerValue,
} from '@/packages/clinico/helpers/AnamnesisAnswerState';
import { clinicoErrorMessage } from '@/packages/clinico/helpers/ClinicoErrorMessage';
import { useAnamnesisCreateHook } from '@/packages/clinico/hooks/Anamnesis/useAnamnesisCreateHook';
import { useAnamnesisFormResolveHook } from '@/packages/clinico/hooks/Anamnesis/useAnamnesisFormResolveHook';
import { useAnamnesisListHook } from '@/packages/clinico/hooks/Anamnesis/useAnamnesisListHook';
import type { AnamnesisUpdateFormDialogProps } from '@/packages/clinico/types/Anamnesis/AnamnesisUpdateFormDialogTypes';
import { cn } from '@/shared/helpers/utils';
import { MotionDialogBody } from '@/shared/motion/MotionDialogBody';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

export function AnamnesisUpdateFormDialog({
  patient,
  professionalId,
  onClose,
}: AnamnesisUpdateFormDialogProps) {
  const formQuery = useAnamnesisFormResolveHook(professionalId);
  const listQuery = useAnamnesisListHook(patient.id);
  const create = useAnamnesisCreateHook(patient.id);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [ready, setReady] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const model = formQuery.data;
  const latest = listQuery.data?.[0];
  const questions = model ? visibleQuestions(model.questions, patient.sex) : [];

  const handleForm = () => {
    if (!model || !listQuery.isSuccess || ready) return;
    setAnswers(initialAnswers(questions, latest?.answers));
    setReady(true);
  };

  useEffect(() => {
    handleForm();
  }, [model, listQuery.isSuccess]);

  const setAnswer = (id: string, value: AnswerValue) =>
    setAnswers((current) => ({ ...current, [id]: value }));

  const missing = questions.filter((question) => question.required && !isAnswered(question, answers[question.id]));

  const onSave = async () => {
    setSubmitted(true);
    if (missing.length > 0) {
      document
        .getElementById(`anamnesis-question-${missing[0]!.id}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    await create.mutateAsync({
      answers: toAnswersPayload(questions, answers),
      professionalId,
    });
    onClose();
  };

  const loadError = formQuery.isError ? formQuery.error : listQuery.isError ? listQuery.error : null;

  return (
    <Dialog open onOpenChange={(open) => !open && !create.isPending && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Atualizar anamnese de {patient.socialName || patient.name}</DialogTitle>
            <DialogDescription>
              {model ? `Questionário: ${model.name}. ` : ''}
              {latest
                ? `Preenchido com as respostas de ${new Date(latest.answeredAt).toLocaleDateString('pt-BR')}. Revise, ajuste o que mudou e salve.`
                : 'Este paciente ainda não tem anamnese. Responda com ele agora.'}
            </DialogDescription>
          </DialogHeader>

          {loadError ? (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{clinicoErrorMessage(loadError)}</AlertDescription>
            </Alert>
          ) : !ready ? (
            <p className="mt-4 text-sm text-muted-foreground">Carregando perguntas…</p>
          ) : (
            <div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {questions.map((question) => {
                const value = answers[question.id];
                const invalid = submitted && question.required && !isAnswered(question, value);
                const yesNo =
                  typeof value === 'object' ? value.value : typeof value === 'boolean' ? value : undefined;
                return (
                  <fieldset key={question.id} id={`anamnesis-question-${question.id}`}
                    className={cn('grid content-start gap-2', question.type === 'TEXT' && 'sm:col-span-2')}
                  >
                    <legend className={cn('text-sm font-medium', invalid && 'text-destructive')}>
                      {question.label}
                      {question.required ? ' *' : ''}
                    </legend>

                    {question.type === 'BOOLEAN' || question.type === 'BOOLEAN_WITH_TEXT' ? (
                      <>
                        <div className="flex gap-2" role="radiogroup" aria-label={question.label}>
                          {[
                            { label: 'Sim', next: true },
                            { label: 'Não', next: false },
                          ].map((option) => (
                            <Button
                              key={option.label}
                              type="button"
                              size="sm"
                              role="radio"
                              aria-checked={yesNo === option.next}
                              variant={yesNo === option.next ? 'default' : 'outline'}
                              onClick={() =>
                                setAnswer(
                                  question.id,
                                  question.type === 'BOOLEAN'
                                    ? option.next
                                    : {
                                        value: option.next,
                                        text: typeof value === 'object' ? value.text : '',
                                      },
                                )
                              }
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                        {question.type === 'BOOLEAN_WITH_TEXT' && yesNo === true ? (
                          <Input
                            placeholder="Qual? (opcional)"
                            aria-label={`Detalhes: ${question.label}`}
                            value={typeof value === 'object' ? value.text : ''}
                            onChange={(event) =>
                              setAnswer(question.id, { value: true, text: event.target.value })
                            }
                          />
                        ) : null}
                      </>
                    ) : null}

                    {question.type === 'SINGLE_CHOICE' ? (
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={question.label}>
                        {(question.options ?? []).map((option) => (
                          <Button
                            key={option}
                            type="button"
                            size="sm"
                            role="radio"
                            aria-checked={value === option}
                            variant={value === option ? 'default' : 'outline'}
                            onClick={() => setAnswer(question.id, option)}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    ) : null}

                    {question.type === 'TEXT' ? (
                      <Textarea
                        rows={2}
                        aria-label={question.label}
                        value={typeof value === 'string' ? value : ''}
                        onChange={(event) => setAnswer(question.id, event.target.value)}
                      />
                    ) : null}

                    {invalid ? <p className="text-xs text-destructive">Responda esta pergunta.</p> : null}
                  </fieldset>
                );
              })}
            </div>
          )}

          {create.isError ? (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{clinicoErrorMessage(create.error)}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={create.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!ready || create.isPending}
              onClick={() => {
                void onSave();
              }}
            >
              {create.isPending ? 'Salvando…' : 'Salvar anamnese'}
            </Button>
          </DialogFooter>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
