'use client';

import { useEffect, useRef, useState } from 'react';
import { formatCents } from '@/packages/operacional/helpers/FormatCents';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import { useQuoteDecisionFormHook } from '@/packages/operacional/hooks/Quote/useQuoteDecisionFormHook';
import { useQuoteDecisionHook } from '@/packages/operacional/hooks/Quote/useQuoteDecisionHook';
import { useQuoteGetHook } from '@/packages/operacional/hooks/Quote/useQuoteGetHook';
import {
  toQuoteDecisionPayload,
  type QuoteDecisionFormValues,
} from '@/packages/operacional/schemas/Quote/QuoteDecisionSchema';
import type { QuoteDecisionFormDialogProps } from '@/packages/operacional/types/Quote/QuoteDecisionFormDialogTypes';
import type { QuoteDecisionResult } from '@/packages/operacional/types/Quote/QuoteTypes';
import { cn } from '@/shared/helpers/utils';
import { useSheetOpenState } from '@/shared/motion/useSheetOpenState';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import { Textarea } from '@/shared/ui/textarea';

function formatDueDate(value: string): string {
  const [year, month, day] = value.split('-');
  if (year && month && day && year.length === 4) return `${day}/${month}/${year}`;
  return value;
}

export function QuoteDecisionFormDialog({ quoteId, onClose }: QuoteDecisionFormDialogProps) {
  const quoteQuery = useQuoteGetHook(quoteId);
  const decide = useQuoteDecisionHook(quoteId);
  const form = useQuoteDecisionFormHook();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [result, setResult] = useState<QuoteDecisionResult | null>(null);
  const { sheetOpen, requestClose, onOpenChange, onOpenChangeComplete } = useSheetOpenState(
    true,
    onClose,
  );

  useEffect(() => {
    const items = quoteQuery.data?.items ?? [];
    if (items.length === 0) return;
    form.reset({
      ...form.getValues(),
      approvedItemIds: items.map((item) => item.id),
    });
  }, [quoteQuery.data, form]);

  const onSave = async (values: QuoteDecisionFormValues) => {
    const data = await decide.mutateAsync({
      quoteDecisionSchema: toQuoteDecisionPayload(values),
      idempotencyKey: idempotencyKey.current,
    });
    setResult(data);
  };

  const selected = new Set(form.watch('approvedItemIds'));
  const decision = form.watch('decision');
  const quote = quoteQuery.data;

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>Decisão presencial</SheetTitle>
          <SheetDescription>
            {result
              ? 'Registro concluído.'
              : quote?.number
                ? `Orçamento nº ${quote.number} · ${formatCents(quote.totalCents)}`
                : 'Aprovar ou recusar com o paciente presente.'}
          </SheetDescription>
        </SheetHeader>

        {result ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <Alert role="status">
                <AlertDescription>
                  {result.status === 'REJECTED'
                    ? 'Orçamento recusado. Nenhum plano foi criado.'
                    : `Aprovado. ${result.treatmentPlanId ? `Plano ${result.treatmentPlanId}.` : 'Plano de tratamento gerado.'}`}
                </AlertDescription>
              </Alert>
              {result.receivable ? (
                <ul className="mt-4 grid gap-1.5 rounded-xl border border-border p-3 text-sm">
                  <li className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Entrada</span>
                    <span className="font-medium tabular-nums">
                      {formatCents(result.receivable.downPaymentCents)}
                    </span>
                  </li>
                  {result.receivable.installments.map((line) => (
                    <li key={line.number} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        Parcela {line.number} · {formatDueDate(line.dueDate)}
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatCents(line.amountCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <SheetFooter className="border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
              <Button type="button" className="cursor-pointer" onClick={requestClose}>
                Fechar
              </Button>
            </SheetFooter>
          </div>
        ) : quoteQuery.isLoading ? (
          <div className="grid gap-2 px-4 py-4" aria-busy="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              void form.handleSubmit(onSave)(event);
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div
                className="mb-4 inline-flex w-full rounded-full border border-border bg-card p-0.5"
                role="group"
                aria-label="Tipo de decisão"
              >
                {(
                  [
                    { value: 'APPROVED', label: 'Aprovar' },
                    { value: 'REJECTED', label: 'Recusar' },
                  ] as const
                ).map((option) => {
                  const selectedOption = decision === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selectedOption}
                      className={cn(
                        'flex-1 cursor-pointer rounded-full px-3 py-2 text-sm font-medium transition-colors',
                        selectedOption
                          ? option.value === 'REJECTED'
                            ? 'bg-destructive text-destructive-foreground'
                            : 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                      onClick={() => form.setValue('decision', option.value)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <FieldGroup>
                {decision === 'APPROVED' ? (
                  <>
                    <div className="grid gap-2">
                      <p className="text-sm font-semibold text-foreground">Itens aprovados</p>
                      {(quoteQuery.data?.items ?? []).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-2 rounded-lg border border-border px-3 py-2"
                        >
                          <Checkbox
                            id={`quote-decide-item-${item.id}`}
                            checked={selected.has(item.id)}
                            onCheckedChange={(checked) => {
                              const next = new Set(selected);
                              if (checked === true) next.add(item.id);
                              else next.delete(item.id);
                              form.setValue('approvedItemIds', [...next], {
                                shouldValidate: true,
                              });
                            }}
                          />
                          <FieldLabel
                            htmlFor={`quote-decide-item-${item.id}`}
                            className="min-w-0 flex-1 cursor-pointer font-normal"
                          >
                            <span className="block text-sm text-foreground">
                              {item.procedureName}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {[
                                item.toothCode ? `Dente ${item.toothCode}` : null,
                                formatCents(item.totalCents),
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          </FieldLabel>
                        </div>
                      ))}
                      <FieldError>{form.formState.errors.approvedItemIds?.message}</FieldError>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field data-invalid={Boolean(form.formState.errors.installments)}>
                        <FieldLabel htmlFor="quote-installments">Parcelas</FieldLabel>
                        <Input
                          id="quote-installments"
                          type="number"
                          min={1}
                          max={60}
                          {...form.register('installments', { valueAsNumber: true })}
                        />
                        <FieldError>{form.formState.errors.installments?.message}</FieldError>
                      </Field>
                      <Field data-invalid={Boolean(form.formState.errors.firstDueDate)}>
                        <FieldLabel htmlFor="quote-first-due">1º vencimento</FieldLabel>
                        <Input
                          id="quote-first-due"
                          type="date"
                          {...form.register('firstDueDate')}
                        />
                        <FieldError>{form.formState.errors.firstDueDate?.message}</FieldError>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="quote-down">Entrada (R$)</FieldLabel>
                        <Input
                          id="quote-down"
                          inputMode="decimal"
                          placeholder="0,00"
                          {...form.register('downPaymentReais')}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="quote-method">Forma de pagamento</FieldLabel>
                        <Input id="quote-method" placeholder="PIX" {...form.register('method')} />
                      </Field>
                    </div>
                  </>
                ) : (
                  <Field data-invalid={Boolean(form.formState.errors.reason)}>
                    <FieldLabel htmlFor="quote-reason">Motivo da recusa</FieldLabel>
                    <Textarea
                      id="quote-reason"
                      rows={4}
                      placeholder="Descreva o motivo com clareza (mín. 10 caracteres)."
                      {...form.register('reason')}
                    />
                    <FieldError>{form.formState.errors.reason?.message}</FieldError>
                  </Field>
                )}
              </FieldGroup>

              {decide.isError ? (
                <Alert variant="destructive" className="mt-4" role="alert">
                  <AlertDescription>{operacionalErrorMessage(decide.error)}</AlertDescription>
                </Alert>
              ) : null}
            </div>

            <SheetFooter className="border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={requestClose}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="cursor-pointer"
                variant={decision === 'REJECTED' ? 'destructive' : 'default'}
                disabled={decide.isPending}
              >
                {decide.isPending
                  ? 'Registrando…'
                  : decision === 'REJECTED'
                    ? 'Confirmar recusa'
                    : 'Aprovar'}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
