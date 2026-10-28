'use client';

import { useEffect, useState } from 'react';
import { DocumentRichEditor } from '@/packages/operacional/components/Document/DocumentRichEditor';
import { DOCUMENT_KIND_LABELS } from '@/packages/operacional/enum/Document/DocumentKindEnum';
import { canIssueDocumentKind } from '@/packages/operacional/helpers/DocumentAccess';
import { EMPTY_DOCUMENT } from '@/packages/operacional/helpers/DocumentContent';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import { useAgendaProfessionalListHook } from '@/packages/operacional/hooks/Appointment/useAgendaProfessionalListHook';
import { useDocumentCreateHook } from '@/packages/operacional/hooks/Document/useDocumentCreateHook';
import { useDocumentGetHook } from '@/packages/operacional/hooks/Document/useDocumentGetHook';
import { useDocumentIssueFormHook } from '@/packages/operacional/hooks/Document/useDocumentIssueFormHook';
import { useDocumentTemplateListHook } from '@/packages/operacional/hooks/Document/useDocumentTemplateListHook';
import { useDocumentTemplatePreviewHook } from '@/packages/operacional/hooks/Document/useDocumentTemplatePreviewHook';
import type { DocumentIssueFormValues } from '@/packages/operacional/schemas/Document/DocumentIssueSchema';
import type { DocumentIssueFormDialogProps } from '@/packages/operacional/types/Document/DocumentFormDialogTypes';
import { useAuth } from '@/shared/auth/AuthProvider';
import { cn } from '@/shared/helpers/utils';
import { useSheetOpenState } from '@/shared/motion/useSheetOpenState';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import { Textarea } from '@/shared/ui/textarea';

const MIN_AMEND_REASON = 10;

export function DocumentIssueFormDialog({
  patientId,
  amendDocumentId,
  onClose,
  onIssued,
}: DocumentIssueFormDialogProps) {
  const { me } = useAuth();
  const amend = useDocumentGetHook(amendDocumentId);
  const templates = useDocumentTemplateListHook();
  const professionals = useAgendaProfessionalListHook();
  const preview = useDocumentTemplatePreviewHook();
  const create = useDocumentCreateHook(patientId);
  const form = useDocumentIssueFormHook({
    templateId: '',
    professionalId: '',
    title: '',
    amendReason: '',
    content: EMPTY_DOCUMENT,
  });
  const [editorKey, setEditorKey] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const { sheetOpen, requestClose, onOpenChange, onOpenChangeComplete } = useSheetOpenState(
    true,
    onClose,
  );

  const activeProfessionals = (professionals.data ?? []).filter((professional) => professional.active);
  const availableTemplates = (templates.data ?? []).filter((template) =>
    canIssueDocumentKind(me, template.kind),
  );
  const templateId = form.watch('templateId');
  const professionalId = form.watch('professionalId');
  const isAmend = Boolean(amendDocumentId);
  const editorReady = isAmend ? Boolean(amend.data) : Boolean(templateId) && !preview.isPending;

  const handleForm = () => {
    if (amend.data) {
      form.reset({
        templateId: amend.data.templateId ?? '',
        professionalId: amend.data.professionalId,
        title: amend.data.title,
        amendReason: '',
        content: amend.data.content,
      });
      setEditorKey((key) => key + 1);
    }
  };

  useEffect(handleForm, [amend.data]);

  useEffect(() => {
    const only = activeProfessionals[0];
    if (isAmend || form.getValues('professionalId') || activeProfessionals.length !== 1 || !only) return;
    form.setValue('professionalId', only.id);
  }, [isAmend, activeProfessionals, form]);

  const loadPreview = async (nextTemplateId: string, nextProfessionalId: string) => {
    setServerError(null);
    try {
      const result = await preview.mutateAsync({
        templateId: nextTemplateId,
        patientId,
        professionalId: nextProfessionalId,
      });
      form.setValue('content', result.content);
      form.setValue('title', result.title);
      setEditorKey((key) => key + 1);
    } catch (error) {
      setServerError(operacionalErrorMessage(error));
    }
  };

  const onPickTemplate = (nextTemplateId: string) => {
    form.setValue('templateId', nextTemplateId, { shouldValidate: true });
    if (!professionalId) {
      form.setError('professionalId', { message: 'Escolha o profissional responsável.' });
      return;
    }
    void loadPreview(nextTemplateId, professionalId);
  };

  const onPickProfessional = (nextProfessionalId: string) => {
    form.setValue('professionalId', nextProfessionalId, { shouldValidate: true });
    if (!isAmend && templateId) void loadPreview(templateId, nextProfessionalId);
  };

  const onSave = async (values: DocumentIssueFormValues) => {
    setServerError(null);
    if (isAmend && values.amendReason.length < MIN_AMEND_REASON) {
      form.setError('amendReason', { message: 'Explique o que foi corrigido (mínimo de 10 letras).' });
      return;
    }
    try {
      const issued = await create.mutateAsync({
        patientId,
        templateId: values.templateId,
        professionalId: values.professionalId,
        title: values.title,
        content: values.content,
        ...(isAmend ? { supersedesId: amendDocumentId, amendReason: values.amendReason } : {}),
      });
      onIssued(issued);
      requestClose();
    } catch (error) {
      setServerError(operacionalErrorMessage(error));
    }
  };

  return (
    <Sheet open={sheetOpen} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>{isAmend ? 'Corrigir documento' : 'Novo documento'}</SheetTitle>
          <SheetDescription>
            {isAmend
              ? 'A correção vira uma nova versão. O documento anterior fica cancelado, mas continua guardado.'
              : 'Escolha o modelo, confira o texto e emita. O PDF fica guardado na ficha do paciente.'}
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            void form.handleSubmit(onSave)(event);
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="document-professional">Dentista responsável</FieldLabel>
                <NativeSelect
                  id="document-professional"
                  className="w-full"
                  value={professionalId}
                  disabled={isAmend}
                  onChange={(event) => onPickProfessional(event.target.value)}
                >
                  <NativeSelectOption value="">Escolha o dentista</NativeSelectOption>
                  {activeProfessionals.map((professional) => (
                    <NativeSelectOption key={professional.id} value={professional.id}>
                      {professional.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={[form.formState.errors.professionalId]} />
              </Field>

              {isAmend ? null : (
                <Field>
                  <FieldLabel id="document-template-label">Modelo</FieldLabel>
                  {templates.isLoading ? (
                    <p className="text-sm text-muted-foreground">Buscando os modelos…</p>
                  ) : availableTemplates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum modelo disponível para o seu acesso. Peça ao responsável da clínica para criar em
                      Configurações → Documentos.
                    </p>
                  ) : (
                    <div
                      className="grid gap-2 sm:grid-cols-2"
                      role="radiogroup"
                      aria-labelledby="document-template-label"
                    >
                      {availableTemplates.map((template) => {
                        const selected = templateId === template.id;
                        return (
                          <button
                            key={template.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            className={cn(
                              'flex cursor-pointer flex-col rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                              selected
                                ? 'border-primary bg-primary/5 text-foreground'
                                : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                            )}
                            onClick={() => onPickTemplate(template.id)}
                          >
                            <span className="font-medium text-foreground">{template.name}</span>
                            <span className="text-xs">{DOCUMENT_KIND_LABELS[template.kind]}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <FieldError errors={[form.formState.errors.templateId]} />
                </Field>
              )}

              {preview.isPending || (isAmend && amend.isLoading) ? (
                <p className="text-sm text-muted-foreground" role="status">
                  Preparando o documento…
                </p>
              ) : null}

              {editorReady ? (
                <>
                  <Field>
                    <FieldLabel htmlFor="document-title">Título</FieldLabel>
                    <Input
                      id="document-title"
                      aria-invalid={Boolean(form.formState.errors.title)}
                      {...form.register('title')}
                    />
                    <FieldError errors={[form.formState.errors.title]} />
                  </Field>

                  <Field>
                    <FieldLabel>Texto</FieldLabel>
                    <DocumentRichEditor
                      key={editorKey}
                      ariaLabel="Texto do documento"
                      initialValue={form.getValues('content')}
                      onChange={(value) =>
                        form.setValue('content', value, { shouldValidate: form.formState.isSubmitted })
                      }
                    />
                    <FieldDescription>
                      Pode ajustar o texto só para este paciente. O modelo da clínica não muda.
                    </FieldDescription>
                    <FieldError errors={[form.formState.errors.content]} />
                  </Field>

                  {isAmend ? (
                    <Field>
                      <FieldLabel htmlFor="document-amend-reason">O que foi corrigido?</FieldLabel>
                      <Textarea
                        id="document-amend-reason"
                        rows={3}
                        aria-invalid={Boolean(form.formState.errors.amendReason)}
                        {...form.register('amendReason')}
                      />
                      <FieldError errors={[form.formState.errors.amendReason]} />
                    </Field>
                  ) : null}
                </>
              ) : null}

              {amend.isError ? (
                <Alert variant="destructive">
                  <AlertDescription>{operacionalErrorMessage(amend.error)}</AlertDescription>
                </Alert>
              ) : null}
              {serverError ? (
                <Alert variant="destructive">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              ) : null}
            </FieldGroup>
          </div>

          <SheetFooter className="border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="cursor-pointer" onClick={requestClose}>
              Cancelar
            </Button>
            <Button type="submit" className="cursor-pointer" disabled={!editorReady || create.isPending}>
              {create.isPending ? 'Emitindo…' : isAmend ? 'Emitir correção' : 'Emitir documento'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
