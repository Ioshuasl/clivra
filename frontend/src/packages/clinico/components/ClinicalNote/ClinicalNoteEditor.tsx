'use client';

import { useEffect, useState } from 'react';
import { ClinicalNoteSignConfirmDialog } from '@/packages/clinico/components/ClinicalNote/ClinicalNoteSignConfirmDialog';
import { CLINICAL_NOTE_TEMPLATES } from '@/packages/clinico/helpers/ClinicalNoteTemplates';
import {
  clearClinicalNoteDraft,
  readClinicalNoteDraft,
  writeClinicalNoteDraft,
} from '@/packages/clinico/helpers/ClinicalNoteDraft';
import { useClinicalNoteCreateHook } from '@/packages/clinico/hooks/ClinicalNote/useClinicalNoteCreateHook';
import { useClinicalNoteFormHook } from '@/packages/clinico/hooks/ClinicalNote/useClinicalNoteFormHook';
import type { ClinicalNoteCreateFormValues } from '@/packages/clinico/schemas/ClinicalNote/ClinicalNoteSchema';
import { Can } from '@/shared/auth/Can';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Field, FieldError, FieldLabel } from '@/shared/ui/field';
import { Textarea } from '@/shared/ui/textarea';

type ClinicalNoteEditorProps = {
  patientId: string;
  appointmentId: string;
};

export function ClinicalNoteEditor({ patientId, appointmentId }: ClinicalNoteEditorProps) {
  const draft = readClinicalNoteDraft(appointmentId);
  const form = useClinicalNoteFormHook(draft);
  const create = useClinicalNoteCreateHook(patientId, appointmentId);
  const [signed, setSigned] = useState(false);
  const [toSign, setToSign] = useState<ClinicalNoteCreateFormValues | null>(null);
  const content = form.watch('content') ?? '';

  useEffect(() => {
    writeClinicalNoteDraft(appointmentId, content);
  }, [appointmentId, content]);

  const onSave = async () => {
    if (!toSign) return;
    await create.mutateAsync({
      patientId,
      appointmentId,
      content: toSign.content,
    });
    clearClinicalNoteDraft(appointmentId);
    form.reset({ content: '' });
    setToSign(null);
    setSigned(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Evolução</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {signed ? (
          <Alert>
            <AlertTitle>Evolução assinada</AlertTitle>
            <AlertDescription>
              Esta evolução não pode ser editada; correções geram uma nova versão.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-1">
          {CLINICAL_NOTE_TEMPLATES.map((template) => (
            <Button
              key={template.id}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const current = form.getValues('content')?.trim() ?? '';
                const next = current ? `${current}\n${template.text}` : template.text;
                form.setValue('content', next, { shouldValidate: true });
              }}
            >
              {template.label}
            </Button>
          ))}
        </div>

        <form
          className="grid gap-3"
          onSubmit={(event) => {
            void form.handleSubmit((values) => setToSign(values))(event);
          }}
        >
          <Field data-invalid={Boolean(form.formState.errors.content)}>
            <FieldLabel htmlFor="clinical-note-content">O que foi feito neste atendimento?</FieldLabel>
            <Textarea
              id="clinical-note-content"
              rows={8}
              placeholder="Escolha um modelo acima ou escreva livremente. Você poderá revisar antes de assinar."
              {...form.register('content')}
            />
            <p className="text-xs text-muted-foreground">
              {content.trim().length} caracteres · rascunho salvo automaticamente neste computador
            </p>
            <FieldError>{form.formState.errors.content?.message}</FieldError>
          </Field>
          <Can permission="clinical_records.write">
            <Button type="submit" disabled={create.isPending}>
              Revisar e assinar
            </Button>
          </Can>
        </form>
        {toSign ? (
          <ClinicalNoteSignConfirmDialog
            content={toSign.content}
            isPending={create.isPending}
            onConfirm={() => {
              void onSave();
            }}
            onClose={() => setToSign(null)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
