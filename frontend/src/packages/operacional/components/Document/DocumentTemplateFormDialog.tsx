'use client';

import { useState } from 'react';
import { DocumentRichEditor } from '@/packages/operacional/components/Document/DocumentRichEditor';
import {
  DOCUMENT_KINDS,
  DOCUMENT_KIND_LABELS,
} from '@/packages/operacional/enum/Document/DocumentKindEnum';
import {
  SIGNATURE_POLICIES,
  SIGNATURE_POLICY_LABELS,
} from '@/packages/operacional/enum/Document/SignaturePolicyEnum';
import { EMPTY_DOCUMENT } from '@/packages/operacional/helpers/DocumentContent';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import { useDocumentTemplateCreateHook } from '@/packages/operacional/hooks/Document/useDocumentTemplateCreateHook';
import { useDocumentTemplateFormHook } from '@/packages/operacional/hooks/Document/useDocumentTemplateFormHook';
import { useDocumentTemplateUpdateHook } from '@/packages/operacional/hooks/Document/useDocumentTemplateUpdateHook';
import type { DocumentTemplateFormValues } from '@/packages/operacional/schemas/Document/DocumentTemplateSchema';
import type { DocumentTemplateFormDialogProps } from '@/packages/operacional/types/Document/DocumentFormDialogTypes';
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

export function DocumentTemplateFormDialog({ template, onClose }: DocumentTemplateFormDialogProps) {
  const form = useDocumentTemplateFormHook({
    name: template?.name ?? '',
    kind: template?.kind ?? 'OTHER',
    professionalSignature: template?.professionalSignature ?? 'NONE',
    patientSignature: template?.patientSignature ?? 'NONE',
    content: template?.content ?? EMPTY_DOCUMENT,
  });
  const create = useDocumentTemplateCreateHook();
  const update = useDocumentTemplateUpdateHook();
  const [serverError, setServerError] = useState<string | null>(null);
  const { sheetOpen, requestClose, onOpenChange, onOpenChangeComplete } = useSheetOpenState(
    true,
    onClose,
  );

  const saving = create.isPending || update.isPending;

  const onSave = async (values: DocumentTemplateFormValues) => {
    setServerError(null);
    try {
      if (template) {
        await update.mutateAsync({ templateId: template.id, template: values });
      } else {
        await create.mutateAsync(values);
      }
      requestClose();
    } catch (error) {
      setServerError(operacionalErrorMessage(error));
    }
  };

  return (
    <Sheet open={sheetOpen} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>{template ? 'Editar modelo' : 'Novo modelo de documento'}</SheetTitle>
          <SheetDescription>
            Escreva o texto uma vez. Ao emitir para um paciente, o sistema preenche os dados dele.
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
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="document-template-name">Nome do modelo</FieldLabel>
                  <Input
                    id="document-template-name"
                    placeholder="Ex.: Atestado de comparecimento"
                    aria-invalid={Boolean(form.formState.errors.name)}
                    {...form.register('name')}
                  />
                  <FieldError errors={[form.formState.errors.name]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="document-template-kind">Tipo de documento</FieldLabel>
                  <NativeSelect id="document-template-kind" className="w-full" {...form.register('kind')}>
                    {DOCUMENT_KINDS.map((kind) => (
                      <NativeSelectOption key={kind} value={kind}>
                        {DOCUMENT_KIND_LABELS[kind]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription>
                    Receita e atestado só aparecem para quem acessa o prontuário.
                  </FieldDescription>
                </Field>
              </div>

              <Field>
                <FieldLabel>Texto do documento</FieldLabel>
                <DocumentRichEditor
                  ariaLabel="Texto do modelo"
                  showVariables
                  showQuoteVariables={form.watch('kind') === 'CONTRACT'}
                  initialValue={form.getValues('content')}
                  onChange={(value) =>
                    form.setValue('content', value, { shouldValidate: form.formState.isSubmitted })
                  }
                />
                <FieldError errors={[form.formState.errors.content]} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="document-template-professional-signature">
                    Assinatura digital do dentista
                  </FieldLabel>
                  <NativeSelect
                    id="document-template-professional-signature"
                    className="w-full"
                    {...form.register('professionalSignature')}
                  >
                    {SIGNATURE_POLICIES.map((policy) => (
                      <NativeSelectOption key={policy} value={policy}>
                        {SIGNATURE_POLICY_LABELS[policy]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription>
                    Opcional: o dentista pode assinar com o certificado digital. Obrigatória: o documento só
                    fica pronto depois da assinatura.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="document-template-patient-signature">Assinatura do paciente</FieldLabel>
                  <NativeSelect
                    id="document-template-patient-signature"
                    className="w-full"
                    {...form.register('patientSignature')}
                  >
                    {SIGNATURE_POLICIES.map((policy) => (
                      <NativeSelectOption key={policy} value={policy}>
                        {SIGNATURE_POLICY_LABELS[policy]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription>
                    O paciente recebe um link e assina pelo celular. Obrigatória: o documento só fica pronto
                    depois que ele assinar. O PDF sai com a linha da assinatura dele.
                  </FieldDescription>
                </Field>
              </div>

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
            <Button type="submit" className="cursor-pointer" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar modelo'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
