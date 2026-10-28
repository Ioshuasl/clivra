'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray } from 'react-hook-form';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { TOOTH_FACES } from '@/packages/operacional/enum/Quote/ToothFaceEnum';
import {
  centsToReaisInput,
  formatCents,
} from '@/packages/operacional/helpers/FormatCents';
import { useAgendaProfessionalListHook } from '@/packages/operacional/hooks/Appointment/useAgendaProfessionalListHook';
import { usePatientListHook } from '@/packages/operacional/hooks/Patient/usePatientListHook';
import { useQuoteCreateHook } from '@/packages/operacional/hooks/Quote/useQuoteCreateHook';
import {
  useQuoteCreateFormHook,
  useQuoteItemAddFormHook,
  useQuoteUpdateFormHook,
} from '@/packages/operacional/hooks/Quote/useQuoteFormHook';
import { useQuoteGetHook } from '@/packages/operacional/hooks/Quote/useQuoteGetHook';
import { useQuoteItemCreateHook } from '@/packages/operacional/hooks/Quote/useQuoteItemCreateHook';
import { useQuoteItemDeleteHook } from '@/packages/operacional/hooks/Quote/useQuoteItemDeleteHook';
import { useQuoteProcedureListHook } from '@/packages/operacional/hooks/Quote/useQuoteProcedureListHook';
import { useQuoteUpdateHook } from '@/packages/operacional/hooks/Quote/useQuoteUpdateHook';
import {
  toQuoteCreatePayload,
  toQuoteItemPayload,
  toQuoteUpdatePayload,
  type QuoteCreateFormValues,
  type QuoteItemAddFormValues,
  type QuoteUpdateFormValues,
} from '@/packages/operacional/schemas/Quote/QuoteSchema';
import type { QuoteFormDialogProps } from '@/packages/operacional/types/Quote/QuoteFormDialogTypes';
import type { QuoteProcedureOption } from '@/packages/operacional/types/Quote/QuoteTypes';
import { useAuth } from '@/shared/auth/AuthProvider';
import { useSheetOpenState } from '@/shared/motion/useSheetOpenState';
import { Button } from '@/shared/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/shared/ui/combobox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
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
import { DatePicker } from '@/shared/ui/date-picker';
import { dateToIso, isoToDate } from '@/shared/helpers/DateIso';

const emptyItem: QuoteCreateFormValues['items'][number] = {
  procedureId: '',
  toothCode: '',
  face: '',
  quantity: 1,
  discountCents: 0,
};

function procedureLabel(item: QuoteProcedureOption): string {
  return `${item.name} · ${formatCents(item.priceCents)}`;
}

export function QuoteFormDialog({ open, quoteId, patientId, onClose }: QuoteFormDialogProps) {
  const isEdit = Boolean(quoteId);
  const { sheetOpen, requestClose, onOpenChange, onOpenChangeComplete } = useSheetOpenState(
    open,
    onClose,
  );

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        {isEdit && quoteId ? (
          <QuoteEditForm quoteId={quoteId} onClose={requestClose} />
        ) : (
          <QuoteCreateForm patientId={patientId} onClose={requestClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function QuoteCreateForm({
  patientId,
  onClose,
}: {
  patientId?: string;
  onClose: () => void;
}) {
  const { me } = useAuth();
  const form = useQuoteCreateFormHook(patientId);
  const create = useQuoteCreateHook();
  const professionalsQuery = useAgendaProfessionalListHook();
  const proceduresQuery = useQuoteProcedureListHook();
  const [patientSearch, setPatientSearch] = useState('');
  const deferredSearch = useDeferredValue(patientSearch);
  const patientsQuery = usePatientListHook(deferredSearch, { active: 'true', limit: 30 });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const receptionLocked = me?.current.role === 'RECEPTION';

  const patients = patientsQuery.data?.items ?? [];
  const patientIds = useMemo(() => {
    const ids = patients.map((item) => item.id);
    if (patientId && !ids.includes(patientId)) return [patientId, ...ids];
    return ids;
  }, [patients, patientId]);

  // Guarda os nomes já carregados: ao escolher, o campo vira o nome, a busca muda e a lista esvazia.
  const patientLabels = useRef(new Map<string, string>());
  const patientLabelById = useMemo(() => {
    for (const item of patients) {
      patientLabels.current.set(item.id, `#${item.code} ${item.socialName || item.name}`);
    }
    return (id: string) => patientLabels.current.get(id) ?? id;
  }, [patients]);

  const procedures = proceduresQuery.data ?? [];
  const procedureIds = useMemo(() => procedures.map((item) => item.id), [procedures]);
  const procedureById = useMemo(
    () => new Map(procedures.map((item) => [item.id, item] as const)),
    [procedures],
  );
  const procedureLabelById = (id: string) => {
    const item = procedureById.get(id);
    return item ? procedureLabel(item) : id;
  };

  useEffect(() => {
    form.reset({
      patientId: patientId ?? '',
      professionalId: '',
      validUntil: '',
      notes: '',
      discountReais: '0',
      items: [emptyItem],
    });
    setPatientSearch('');
  }, [patientId, form]);

  const onSave = async (values: QuoteCreateFormValues) => {
    await create.mutateAsync(toQuoteCreatePayload(values));
    onClose();
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        void form.handleSubmit(onSave)(event);
      }}
    >
      <SheetHeader className="border-b border-border px-4 py-4 text-left">
        <SheetTitle>Novo orçamento</SheetTitle>
        <SheetDescription>Paciente, profissional e itens da proposta.</SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <FieldGroup>
          {!patientId ? (
            <Field data-invalid={Boolean(form.formState.errors.patientId)}>
              <FieldLabel htmlFor="quote-patient">Paciente</FieldLabel>
              <Controller
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <Combobox
                    items={patientIds}
                    value={field.value || null}
                    onValueChange={(next) => {
                      field.onChange(typeof next === 'string' ? next : '');
                    }}
                    onInputValueChange={setPatientSearch}
                    itemToStringLabel={patientLabelById}
                    filter={null}
                  >
                    <ComboboxInput
                      id="quote-patient"
                      placeholder="Buscar paciente…"
                      className="w-full"
                      showClear
                    />
                    <ComboboxContent className="z-[80]">
                      <ComboboxEmpty>
                        {patientsQuery.isLoading ? 'Carregando…' : 'Nenhum paciente encontrado.'}
                      </ComboboxEmpty>
                      <ComboboxList>
                        {(id: string) => (
                          <ComboboxItem key={id} value={id}>
                            {patientLabelById(id)}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                )}
              />
              <FieldError>{form.formState.errors.patientId?.message}</FieldError>
            </Field>
          ) : null}

          <Field data-invalid={Boolean(form.formState.errors.professionalId)}>
            <FieldLabel htmlFor="quote-professional">Profissional</FieldLabel>
            <NativeSelect
              id="quote-professional"
              value={form.watch('professionalId')}
              onChange={(event) =>
                form.setValue('professionalId', event.target.value, { shouldValidate: true })
              }
            >
              <NativeSelectOption value="">Escolha…</NativeSelectOption>
              {(professionalsQuery.data ?? []).map((professional) => (
                <NativeSelectOption key={professional.id} value={professional.id}>
                  {professional.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError>{form.formState.errors.professionalId?.message}</FieldError>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="quote-valid-until">Validade</FieldLabel>
              <DatePicker
                id="quote-valid-until"
                clearable={true}
                value={isoToDate(form.watch('validUntil'))}
                onChange={(next) =>
                  form.setValue('validUntil', dateToIso(next), { shouldValidate: true, shouldDirty: true })
                }
                aria-invalid={Boolean(form.formState.errors.validUntil)}
              />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.discountReais)}>
              <FieldLabel htmlFor="quote-discount">Desconto (R$)</FieldLabel>
              <Input
                id="quote-discount"
                inputMode="decimal"
                placeholder="0,00"
                disabled={receptionLocked}
                {...form.register('discountReais')}
              />
              <FieldError>{form.formState.errors.discountReais?.message}</FieldError>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="quote-notes">Observações comerciais</FieldLabel>
            <Textarea id="quote-notes" rows={2} placeholder="Opcional" {...form.register('notes')} />
          </Field>
        </FieldGroup>

        <div className="mt-6 grid gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Itens</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => append(emptyItem)}
            >
              <PlusIcon className="size-4" strokeWidth={1.7} />
              Adicionar
            </Button>
          </div>

          {fields.map((field, index) => {
            const procedureId = form.watch(`items.${index}.procedureId`);
            const procedure = procedureById.get(procedureId);
            return (
              <div
                key={field.id}
                className="grid gap-3 rounded-xl border border-border bg-card p-3 shadow-[0_1px_2px_rgb(74_15_22/0.04)]"
              >
                <Field data-invalid={Boolean(form.formState.errors.items?.[index]?.procedureId)}>
                  <FieldLabel htmlFor={`quote-item-procedure-${index}`}>Procedimento</FieldLabel>
                  <Controller
                    control={form.control}
                    name={`items.${index}.procedureId`}
                    render={({ field: itemField }) => (
                      <Combobox
                        items={procedureIds}
                        value={itemField.value || null}
                        onValueChange={(next) => {
                          itemField.onChange(typeof next === 'string' ? next : '');
                        }}
                        itemToStringLabel={procedureLabelById}
                      >
                        <ComboboxInput
                          id={`quote-item-procedure-${index}`}
                          placeholder="Buscar procedimento…"
                          className="w-full"
                          showClear
                        />
                        <ComboboxContent className="z-[80]">
                          <ComboboxEmpty>
                            {proceduresQuery.isLoading
                              ? 'Carregando…'
                              : 'Nenhum procedimento encontrado.'}
                          </ComboboxEmpty>
                          <ComboboxList>
                            {(id: string) => (
                              <ComboboxItem key={id} value={id}>
                                {procedureLabelById(id)}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    )}
                  />
                  <FieldError>
                    {form.formState.errors.items?.[index]?.procedureId?.message}
                  </FieldError>
                </Field>

                <div className="grid gap-3 sm:grid-cols-3">
                  {procedure?.requiresTooth ? (
                    <Field>
                      <FieldLabel htmlFor={`quote-item-tooth-${index}`}>Dente</FieldLabel>
                      <Input
                        id={`quote-item-tooth-${index}`}
                        maxLength={2}
                        inputMode="numeric"
                        {...form.register(`items.${index}.toothCode`)}
                      />
                    </Field>
                  ) : null}
                  {procedure?.requiresFace ? (
                    <Field>
                      <FieldLabel htmlFor={`quote-item-face-${index}`}>Face</FieldLabel>
                      <NativeSelect
                        id={`quote-item-face-${index}`}
                        value={form.watch(`items.${index}.face`) ?? ''}
                        onChange={(event) =>
                          form.setValue(
                            `items.${index}.face`,
                            event.target.value as QuoteCreateFormValues['items'][number]['face'],
                          )
                        }
                      >
                        <NativeSelectOption value="">—</NativeSelectOption>
                        {TOOTH_FACES.map((face) => (
                          <NativeSelectOption key={face} value={face}>
                            {face}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                  ) : null}
                  <Field>
                    <FieldLabel htmlFor={`quote-item-qty-${index}`}>Quantidade</FieldLabel>
                    <Input
                      id={`quote-item-qty-${index}`}
                      type="number"
                      min={1}
                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                  </Field>
                </div>

                {fields.length > 1 ? (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash2Icon className="size-4" strokeWidth={1.7} />
                      Remover
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
          {form.formState.errors.items?.root?.message ||
          typeof form.formState.errors.items?.message === 'string' ? (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.items?.root?.message ??
                form.formState.errors.items?.message}
            </p>
          ) : null}
        </div>

      </div>

      <SheetFooter className="border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="cursor-pointer" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="cursor-pointer" disabled={create.isPending}>
          {create.isPending ? 'Salvando…' : 'Criar orçamento'}
        </Button>
      </SheetFooter>
    </form>
  );
}

function QuoteEditForm({ quoteId, onClose }: { quoteId: string; onClose: () => void }) {
  const { me } = useAuth();
  const quoteQuery = useQuoteGetHook(quoteId);
  const form = useQuoteUpdateFormHook();
  const itemForm = useQuoteItemAddFormHook();
  const update = useQuoteUpdateHook(quoteId);
  const addItem = useQuoteItemCreateHook(quoteId);
  const removeItem = useQuoteItemDeleteHook(quoteId);
  const proceduresQuery = useQuoteProcedureListHook();
  const receptionLocked = me?.current.role === 'RECEPTION';

  const procedures = proceduresQuery.data ?? [];
  const procedureIds = useMemo(() => procedures.map((item) => item.id), [procedures]);
  const procedureById = useMemo(
    () => new Map(procedures.map((item) => [item.id, item] as const)),
    [procedures],
  );
  const procedureLabelById = (id: string) => {
    const item = procedureById.get(id);
    return item ? procedureLabel(item) : id;
  };

  useEffect(() => {
    const quote = quoteQuery.data;
    if (!quote) return;
    form.reset({
      validUntil: quote.validUntil ?? '',
      notes: quote.notes ?? '',
      discountReais: centsToReaisInput(quote.discountCents),
    });
  }, [quoteQuery.data, form]);

  const onSave = async (values: QuoteUpdateFormValues) => {
    await update.mutateAsync(toQuoteUpdatePayload(values));
    onClose();
  };

  const onAddItem = async (values: QuoteItemAddFormValues) => {
    await addItem.mutateAsync(toQuoteItemPayload(values));
    itemForm.reset(emptyItem);
  };

  const quote = quoteQuery.data;
  const addProcedureId = itemForm.watch('procedureId');
  const addProcedure = procedureById.get(addProcedureId);
  const pending = update.isPending;

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        void form.handleSubmit(onSave)(event);
      }}
    >
      <SheetHeader className="border-b border-border px-4 py-4 text-left">
        <SheetTitle>
          {quote?.number ? `Orçamento nº ${quote.number}` : 'Editar orçamento'}
        </SheetTitle>
        <SheetDescription>
          {quote ? `Total ${formatCents(quote.totalCents)} · totais recalculados ao salvar.` : 'Carregando…'}
        </SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {quoteQuery.isLoading ? (
          <div className="grid gap-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="quote-edit-valid">Validade</FieldLabel>
                  <DatePicker
                    id="quote-edit-valid"
                    clearable={true}
                    value={isoToDate(form.watch('validUntil'))}
                    onChange={(next) =>
                      form.setValue('validUntil', dateToIso(next), { shouldValidate: true, shouldDirty: true })
                    }
                    aria-invalid={Boolean(form.formState.errors.validUntil)}
                  />
                </Field>
                <Field data-invalid={Boolean(form.formState.errors.discountReais)}>
                  <FieldLabel htmlFor="quote-edit-discount">Desconto (R$)</FieldLabel>
                  <Input
                    id="quote-edit-discount"
                    inputMode="decimal"
                    placeholder="0,00"
                    disabled={receptionLocked}
                    {...form.register('discountReais')}
                  />
                  <FieldError>{form.formState.errors.discountReais?.message}</FieldError>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="quote-edit-notes">Observações comerciais</FieldLabel>
                <Textarea
                  id="quote-edit-notes"
                  rows={2}
                  placeholder="Opcional"
                  {...form.register('notes')}
                />
              </Field>
            </FieldGroup>

            <div className="mt-6 grid gap-2">
              <p className="text-sm font-semibold text-foreground">Itens</p>
              {(quote?.items ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item neste orçamento.</p>
              ) : (
                (quote?.items ?? []).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.procedureName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[
                          item.toothCode ? `Dente ${item.toothCode}` : null,
                          item.face || null,
                          formatCents(item.totalCents),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="cursor-pointer text-muted-foreground hover:text-destructive"
                      aria-label={`Remover ${item.procedureName}`}
                      disabled={removeItem.isPending}
                      onClick={() => void removeItem.mutateAsync(item.id)}
                    >
                      <Trash2Icon strokeWidth={1.7} />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 grid gap-3 rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-sm font-semibold text-foreground">Adicionar item</p>
              <Field data-invalid={Boolean(itemForm.formState.errors.procedureId)}>
                <FieldLabel htmlFor="quote-add-procedure">Procedimento</FieldLabel>
                <Controller
                  control={itemForm.control}
                  name="procedureId"
                  render={({ field }) => (
                    <Combobox
                      items={procedureIds}
                      value={field.value || null}
                      onValueChange={(next) => {
                        field.onChange(typeof next === 'string' ? next : '');
                      }}
                      itemToStringLabel={procedureLabelById}
                    >
                      <ComboboxInput
                        id="quote-add-procedure"
                        placeholder="Buscar procedimento…"
                        className="w-full"
                        showClear
                      />
                      <ComboboxContent className="z-[80]">
                        <ComboboxEmpty>
                          {proceduresQuery.isLoading
                            ? 'Carregando…'
                            : 'Nenhum procedimento encontrado.'}
                        </ComboboxEmpty>
                        <ComboboxList>
                          {(id: string) => (
                            <ComboboxItem key={id} value={id}>
                              {procedureLabelById(id)}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  )}
                />
                <FieldError>{itemForm.formState.errors.procedureId?.message}</FieldError>
              </Field>

              {addProcedure?.requiresTooth ? (
                <Field>
                  <FieldLabel htmlFor="quote-add-tooth">Dente</FieldLabel>
                  <Input
                    id="quote-add-tooth"
                    maxLength={2}
                    inputMode="numeric"
                    {...itemForm.register('toothCode')}
                  />
                </Field>
              ) : null}
              {addProcedure?.requiresFace ? (
                <Field>
                  <FieldLabel htmlFor="quote-add-face">Face</FieldLabel>
                  <NativeSelect
                    id="quote-add-face"
                    value={itemForm.watch('face') ?? ''}
                    onChange={(event) =>
                      itemForm.setValue(
                        'face',
                        event.target.value as QuoteItemAddFormValues['face'],
                      )
                    }
                  >
                    <NativeSelectOption value="">—</NativeSelectOption>
                    {TOOTH_FACES.map((face) => (
                      <NativeSelectOption key={face} value={face}>
                        {face}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              ) : null}

              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={addItem.isPending}
                onClick={() => void itemForm.handleSubmit(onAddItem)()}
              >
                <PlusIcon className="size-4" strokeWidth={1.7} />
                {addItem.isPending ? 'Incluindo…' : 'Incluir item'}
              </Button>
            </div>

          </>
        )}
      </div>

      <SheetFooter className="border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="cursor-pointer" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          className="cursor-pointer"
          disabled={pending || quoteQuery.isLoading}
        >
          {pending ? 'Salvando…' : 'Salvar'}
        </Button>
      </SheetFooter>
    </form>
  );
}
