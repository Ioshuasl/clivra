'use client';

import { useEffect, useState } from 'react';
import { useFieldArray, type FieldErrors } from 'react-hook-form';
import { PlusIcon } from 'lucide-react';
import { AnamnesisQuestionCard } from '@/packages/admin/components/AnamnesisForm/AnamnesisQuestionCard';
import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import { ANAMNESIS_SUGGESTIONS } from '@/packages/admin/helpers/AnamnesisQuestionSuggestions';
import { useAnamnesisFormCreateHook } from '@/packages/admin/hooks/AnamnesisForm/useAnamnesisFormCreateHook';
import { useAnamnesisFormFormHook } from '@/packages/admin/hooks/AnamnesisForm/useAnamnesisFormFormHook';
import {
  anamnesisFormToFormValues,
  newAnamnesisQuestion,
  type AnamnesisFormCreateFormValues,
} from '@/packages/admin/schemas/AnamnesisForm/AnamnesisFormSchema';
import type { AnamnesisFormFormDialogProps } from '@/packages/admin/types/AnamnesisForm/AnamnesisFormFormDialogTypes';
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
import { Field, FieldError, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

function scrollToQuestion(index: number) {
  requestAnimationFrame(() => {
    document
      .querySelector(`[data-question="${index}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}

export function AnamnesisFormFormDialog({ source, onClose }: AnamnesisFormFormDialogProps) {
  const form = useAnamnesisFormFormHook(source ? anamnesisFormToFormValues(source) : undefined);
  const isNew = !source;
  const create = useAnamnesisFormCreateHook();
  const questions = useFieldArray({ control: form.control, name: 'questions' });
  const [activeIndex, setActiveIndex] = useState<number | null>(
    (source?.questions.length ?? 1) <= 1 ? 0 : null,
  );

  const handleForm = () => {
    if (source) form.reset(anamnesisFormToFormValues(source));
  };

  useEffect(() => {
    handleForm();
  }, [source]);

  const onSave = async (values: AnamnesisFormCreateFormValues) => {
    await create.mutateAsync(values);
    onClose();
  };

  // Ao falhar a validação, abre a primeira pergunta com problema para o usuário corrigir.
  const onInvalid = (errors: FieldErrors<AnamnesisFormCreateFormValues>) => {
    const list = errors.questions;
    if (!Array.isArray(list)) return;
    const first = list.findIndex(Boolean);
    if (first >= 0) {
      setActiveIndex(first);
      scrollToQuestion(first);
    }
  };

  const addQuestion = (overrides?: Parameters<typeof newAnamnesisQuestion>[0], open = true) => {
    const index = questions.fields.length;
    questions.append(newAnamnesisQuestion(overrides));
    if (open) setActiveIndex(index);
    scrollToQuestion(index);
  };

  const existingLabels = new Set(
    form.watch('questions').map((question) => question.label.trim().toLowerCase()),
  );
  const suggestions = ANAMNESIS_SUGGESTIONS.filter(
    (item) => !existingLabels.has((item.question.label ?? '').toLowerCase()),
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-muted sm:max-w-3xl">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>{isNew ? 'Novo modelo de anamnese' : `Editar “${source.name}”`}</DialogTitle>
            <DialogDescription>
              Monte as perguntas que o paciente responde antes do atendimento. Ao salvar, o modelo
              vale para os próximos pacientes e as respostas antigas continuam guardadas.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              void form.handleSubmit(onSave, onInvalid)(event);
            }}
          >
            {isNew ? (
              <div className="rounded-2xl border border-l-4 border-border border-l-primary bg-card p-4">
                <Field data-invalid={Boolean(form.formState.errors.name)}>
                  <FieldLabel htmlFor="anamnesis-form-name">Nome do modelo</FieldLabel>
                  <Input
                    id="anamnesis-form-name"
                    className="h-11 text-base font-medium"
                    placeholder="Ex.: Anamnese Ortodontia"
                    {...form.register('name')}
                  />
                  <FieldError>{form.formState.errors.name?.message}</FieldError>
                </Field>
              </div>
            ) : null}

            <div className="grid gap-3">
              {questions.fields.map((field, index) => (
                <div key={field.id} data-question={index}>
                  <AnamnesisQuestionCard
                    form={form}
                    index={index}
                    total={questions.fields.length}
                    active={activeIndex === index}
                    onActivate={() => setActiveIndex(index)}
                    onMove={(direction) => {
                      const target = index + direction;
                      questions.move(index, target);
                      setActiveIndex(target);
                    }}
                    onDuplicate={() => {
                      const { id: _id, ...copy } = form.getValues(`questions.${index}`);
                      questions.insert(
                        index + 1,
                        newAnamnesisQuestion({ ...copy, label: `${copy.label} (cópia)` }),
                      );
                      setActiveIndex(index + 1);
                    }}
                    onRemove={() => {
                      questions.remove(index);
                      setActiveIndex(null);
                    }}
                  />
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-11 cursor-pointer border-dashed bg-card"
              onClick={() => addQuestion()}
            >
              <PlusIcon />
              Adicionar pergunta
            </Button>

            {suggestions.length > 0 ? (
              <div className="grid gap-2">
                <p className="text-sm font-medium text-foreground">
                  Perguntas prontas{' '}
                  <span className="font-normal text-muted-foreground">
                    — clique para adicionar (já vêm com o aviso certo)
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((item) => (
                    <Button
                      key={item.chip}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer rounded-full bg-card"
                      onClick={() => addQuestion(item.question, false)}
                    >
                      <PlusIcon />
                      {item.chip}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {form.formState.errors.questions?.message ? (
              <Alert variant="destructive">
                <AlertDescription>{form.formState.errors.questions.message}</AlertDescription>
              </Alert>
            ) : null}
            {create.isError ? (
              <Alert variant="destructive">
                <AlertDescription>{adminErrorMessage(create.error)}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter className="sticky bottom-0 -mx-4 -mb-4 border-t bg-background px-4 py-3 sm:-mx-4">
              <Button type="button" variant="outline" className="cursor-pointer" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={create.isPending}>
                {create.isPending ? 'Salvando…' : 'Salvar modelo'}
              </Button>
            </DialogFooter>
          </form>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
