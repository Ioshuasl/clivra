'use client';

import { useEffect, useRef, useState } from 'react';
import { QuoteDecisionShell } from '@/packages/public/components/Quote/QuoteDecisionShell';
import { formatCents } from '@/packages/public/helpers/FormatCents';
import { publicErrorMessage } from '@/packages/public/helpers/PublicErrorMessage';
import { useQuoteDecisionCreateHook } from '@/packages/public/hooks/Quote/useQuoteDecisionCreateHook';
import { useQuoteDecisionFormHook } from '@/packages/public/hooks/Quote/useQuoteDecisionFormHook';
import { useQuoteGetHook } from '@/packages/public/hooks/Quote/useQuoteGetHook';
import {
  toPublicQuoteDecisionPayload,
  type PublicQuoteDecisionFormValues,
} from '@/packages/public/schemas/Quote/QuoteSchema';
import type { QuoteDecisionFormProps } from '@/packages/public/types/Quote/QuoteFormTypes';
import type { PublicQuoteDecisionResult } from '@/packages/public/types/Quote/QuoteTypes';
import { ApiClientError } from '@/shared/api/api-client';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';
import { DatePicker } from '@/shared/ui/date-picker';
import { dateToIso, isoToDate } from '@/shared/helpers/DateIso';

export function QuoteDecisionForm({ token }: QuoteDecisionFormProps) {
  const getQuery = useQuoteGetHook(token);
  const submit = useQuoteDecisionCreateHook();
  const form = useQuoteDecisionFormHook();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [result, setResult] = useState<PublicQuoteDecisionResult | null>(null);

  useEffect(() => {
    const items = getQuery.data?.items ?? [];
    if (items.length === 0) return;
    form.reset({
      ...form.getValues(),
      approvedItemIds: items.map((item) => item.id),
    });
  }, [getQuery.data, form]);

  const onSave = async (values: PublicQuoteDecisionFormValues) => {
    const data = await submit.mutateAsync({
      token,
      quoteDecisionSchema: toPublicQuoteDecisionPayload(values),
      idempotencyKey: idempotencyKey.current,
    });
    setResult(data);
  };

  if (!token) {
    return (
      <QuoteDecisionShell title="Orçamento">
        <Alert variant="destructive">
          <AlertDescription>Link inválido, expirado ou já utilizado.</AlertDescription>
        </Alert>
      </QuoteDecisionShell>
    );
  }

  if (getQuery.isLoading) {
    return (
      <QuoteDecisionShell title="Carregando…">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </QuoteDecisionShell>
    );
  }

  if (getQuery.isError || !getQuery.data) {
    const status = getQuery.error instanceof ApiClientError ? getQuery.error.status : 0;
    const notFound = status === 404;
    const limited = status === 429;
    return (
      <QuoteDecisionShell title="Orçamento">
        <Alert variant="destructive">
          <AlertDescription>
            {notFound
              ? 'Link inválido, expirado ou já utilizado.'
              : limited
                ? publicErrorMessage(getQuery.error)
                : publicErrorMessage(getQuery.error)}
          </AlertDescription>
        </Alert>
        {!notFound ? (
          <Button type="button" size="lg" className="w-full" onClick={() => void getQuery.refetch()}>
            Tentar novamente
          </Button>
        ) : null}
      </QuoteDecisionShell>
    );
  }

  const data = getQuery.data;

  if (result) {
    return (
      <QuoteDecisionShell
        title={data.clinicName}
        description={`Olá, ${data.patientFirstName}.`}
      >
        <Alert>
          <AlertDescription>
            {result.status === 'REJECTED'
              ? 'Recebemos a recusa desta proposta.'
              : 'Proposta registrada. Confira as parcelas abaixo.'}
          </AlertDescription>
        </Alert>
        {result.receivable ? (
          <ul className="grid gap-2 text-sm">
            <li>Entrada: {formatCents(result.receivable.downPaymentCents)}</li>
            {result.receivable.installments.map((line) => (
              <li key={line.number}>
                Parcela {line.number} · {line.dueDate} · {formatCents(line.amountCents)}
              </li>
            ))}
          </ul>
        ) : null}
      </QuoteDecisionShell>
    );
  }

  const selected = new Set(form.watch('approvedItemIds'));
  const decision = form.watch('decision');

  return (
    <QuoteDecisionShell
      title={data.clinicName}
      description={`${data.patientFirstName}, proposta nº ${data.quoteNumber}${
        data.validUntil ? ` · válida até ${data.validUntil}` : ''
      }`}
    >
      <div className="rounded-md border p-3 text-sm">
        <p>Subtotal {formatCents(data.subtotalCents)}</p>
        {data.discountCents > 0 ? <p>Desconto {formatCents(data.discountCents)}</p> : null}
        <p className="font-semibold">Total {formatCents(data.totalCents)}</p>
      </div>

      <form
        className="grid gap-4"
        onSubmit={(event) => {
          void form.handleSubmit(onSave)(event);
        }}
      >
        <FieldGroup>
          {data.items.map((item) => (
            <div key={item.id} className="flex items-start gap-2">
              <Checkbox
                id={`public-quote-item-${item.id}`}
                checked={selected.has(item.id)}
                onCheckedChange={(checked) => {
                  const next = new Set(selected);
                  if (checked === true) next.add(item.id);
                  else next.delete(item.id);
                  form.setValue('approvedItemIds', [...next], { shouldValidate: true });
                }}
              />
              <FieldLabel htmlFor={`public-quote-item-${item.id}`} className="font-normal">
                {item.procedureName}
                {item.toothCode ? ` · dente ${item.toothCode}` : ''}
                {item.face ? ` ${item.face}` : ''} · {formatCents(item.totalCents)}
              </FieldLabel>
            </div>
          ))}
          <FieldError>{form.formState.errors.approvedItemIds?.message}</FieldError>

          {data.requiresGuardian ? (
            <Field>
              <FieldLabel htmlFor="quote-guardian-cpf">CPF do responsável</FieldLabel>
              <Input id="quote-guardian-cpf" {...form.register('guardianCpf')} />
            </Field>
          ) : null}

          {decision === 'APPROVED' ? (
            <div className="grid gap-3">
              <Field>
                <FieldLabel htmlFor="public-quote-installments">Parcelas</FieldLabel>
                <Input
                  id="public-quote-installments"
                  type="number"
                  min={1}
                  max={60}
                  {...form.register('installments', { valueAsNumber: true })}
                />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.firstDueDate)}>
                <FieldLabel htmlFor="public-quote-first-due">1º vencimento</FieldLabel>
                <DatePicker
                  id="public-quote-first-due"
                  clearable={false}
                  value={isoToDate(form.watch('firstDueDate'))}
                  onChange={(next) =>
                    form.setValue('firstDueDate', dateToIso(next), { shouldValidate: true, shouldDirty: true })
                  }
                  aria-invalid={Boolean(form.formState.errors.firstDueDate)}
                />
                <FieldError>{form.formState.errors.firstDueDate?.message}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="public-quote-down">Entrada (R$)</FieldLabel>
                <Input id="public-quote-down" {...form.register('downPaymentReais')} />
              </Field>
            </div>
          ) : (
            <Field data-invalid={Boolean(form.formState.errors.reason)}>
              <FieldLabel htmlFor="public-quote-reason">Motivo da recusa</FieldLabel>
              <Textarea id="public-quote-reason" rows={4} {...form.register('reason')} />
              <FieldError>{form.formState.errors.reason?.message}</FieldError>
            </Field>
          )}
        </FieldGroup>

        {submit.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {submit.error instanceof ApiClientError && submit.error.status === 429
                ? publicErrorMessage(submit.error)
                : publicErrorMessage(submit.error)}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-2">
          {decision === 'APPROVED' ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => form.setValue('decision', 'REJECTED')}
            >
              Recusar proposta
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => form.setValue('decision', 'APPROVED')}
            >
              Voltar à aprovação
            </Button>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={submit.isPending}>
            {submit.isPending
              ? 'Enviando…'
              : decision === 'REJECTED'
                ? 'Confirmar recusa'
                : 'Aprovar'}
          </Button>
        </div>
      </form>
    </QuoteDecisionShell>
  );
}
