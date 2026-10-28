'use client';

import { formatIsoDateBr } from '@/shared/helpers/FormatDateBr';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from '@/packages/financeiro/enum/Payment/PaymentMethodEnum';
import { centsToReaisInput, formatCents } from '@/packages/financeiro/helpers/FormatCents';
import { usePatientCreditGetHook } from '@/packages/financeiro/hooks/Credit/usePatientCreditGetHook';
import { usePaymentCreateHook } from '@/packages/financeiro/hooks/Payment/usePaymentCreateHook';
import { usePaymentFormHook } from '@/packages/financeiro/hooks/Payment/usePaymentFormHook';
import { usePaymentReceiptGetHook } from '@/packages/financeiro/hooks/Payment/usePaymentReceiptGetHook';
import { usePaymentSendReceiptHook } from '@/packages/financeiro/hooks/Payment/usePaymentSendReceiptHook';
import {
  toPaymentCreatePayload,
  type PaymentFormValues,
} from '@/packages/financeiro/schemas/Payment/PaymentSchema';
import type { PaymentFormDialogProps } from '@/packages/financeiro/types/Payment/PaymentFormDialogTypes';
import type { PaymentCreateResult } from '@/packages/financeiro/types/Payment/PaymentTypes';
import { MotionDialogBody } from '@/shared/motion/MotionDialogBody';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { Textarea } from '@/shared/ui/textarea';

function remainingCents(amountCents: number, paidCents: number): number {
  return Math.max(0, amountCents - paidCents);
}

export function PaymentFormDialog({ installment, patientName, onClose }: PaymentFormDialogProps) {
  const balance = remainingCents(installment.amountCents, installment.paidCents);
  const form = usePaymentFormHook({
    notes: '',
    splits: [{ method: 'PIX', amountReais: centsToReaisInput(balance), cardBrand: '', installmentsQty: null }],
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'splits' });
  const creditQuery = usePatientCreditGetHook(installment.patientId);
  const create = usePaymentCreateHook(installment.id);
  const idempotencyKey = useRef(crypto.randomUUID());
  const [result, setResult] = useState<PaymentCreateResult | null>(null);
  const [copyText, setCopyText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const receipt = usePaymentReceiptGetHook();
  const send = usePaymentSendReceiptHook(result?.paymentId ?? '');

  useEffect(() => {
    form.reset({
      notes: '',
      splits: [
        { method: 'PIX', amountReais: centsToReaisInput(balance), cardBrand: '', installmentsQty: null },
      ],
    });
  }, [balance, form]);

  const onSave = async (values: PaymentFormValues) => {
    const data = await create.mutateAsync({
      paymentCreateSchema: toPaymentCreatePayload(values),
      idempotencyKey: idempotencyKey.current,
    });
    setResult(data);
  };

  const onDownloadPdf = async () => {
    if (!result) return;
    const pdf = await receipt.mutateAsync(result.paymentId);
    window.open(pdf.url, '_blank', 'noopener,noreferrer');
  };

  const onSendCopy = async () => {
    if (!result) return;
    setCopied(false);
    const sent = await send.mutateAsync({ channel: 'COPY' });
    setCopyText(sent.copyText ?? `Recibo nº ${sent.receiptNumber}`);
  };

  const onCopy = async () => {
    if (!copyText) return;
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Baixa de parcela</DialogTitle>
          </DialogHeader>

          {result ? (
            <div className="grid gap-3">
              <Alert>
                <AlertTitle>Recibo nº {result.receiptNumber}</AlertTitle>
                <AlertDescription>
                  Baixa registrada. Este documento não é nota fiscal (NFS-e).
                </AlertDescription>
              </Alert>
              {result.creditCentsGranted > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Crédito gerado: {formatCents(result.creditCentsGranted)}
                </p>
              ) : null}
              {copyText ? (
                <Field>
                  <FieldLabel htmlFor="receipt-copy-text">Texto para colar</FieldLabel>
                  <Textarea id="receipt-copy-text" readOnly rows={3} value={copyText} />
                  <Button type="button" variant="outline" onClick={() => void onCopy()}>
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                </Field>
              ) : null}
              <DialogFooter className="flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={receipt.isPending}
                  onClick={() => void onDownloadPdf()}
                >
                  {receipt.isPending ? 'Gerando PDF…' : 'Baixar PDF'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={send.isPending || !result.paymentId}
                  onClick={() => void onSendCopy()}
                >
                  {send.isPending ? 'Preparando…' : 'Enviar (COPY)'}
                </Button>
                <Button type="button" onClick={onClose}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                void form.handleSubmit(onSave)(event);
              }}
            >
              <div className="grid gap-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Paciente:</span> {patientName}
                </p>
                <p>
                  <span className="text-muted-foreground">Parcela:</span> #{installment.number} ·
                  venc. {formatIsoDateBr(installment.dueDate)}
                </p>
                <p>
                  <span className="text-muted-foreground">Saldo:</span> {formatCents(balance)}
                </p>
                <p>
                  <span className="text-muted-foreground">Crédito disponível:</span>{' '}
                  {creditQuery.isLoading
                    ? '…'
                    : formatCents(creditQuery.data?.balanceCents ?? 0)}
                </p>
              </div>

              <FieldGroup>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid gap-3 rounded-lg border p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor={`payment-method-${index}`}>Forma</FieldLabel>
                        <NativeSelect
                          id={`payment-method-${index}`}
                          value={form.watch(`splits.${index}.method`)}
                          onChange={(event) =>
                            form.setValue(
                              `splits.${index}.method`,
                              event.target.value as PaymentFormValues['splits'][number]['method'],
                            )
                          }
                        >
                          {PAYMENT_METHODS.map((method) => (
                            <NativeSelectOption key={method} value={method}>
                              {PAYMENT_METHOD_LABELS[method]}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </Field>
                      <Field data-invalid={Boolean(form.formState.errors.splits?.[index]?.amountReais)}>
                        <FieldLabel htmlFor={`payment-amount-${index}`}>Valor (R$)</FieldLabel>
                        <Input
                          id={`payment-amount-${index}`}
                          {...form.register(`splits.${index}.amountReais`)}
                        />
                        <FieldError>
                          {form.formState.errors.splits?.[index]?.amountReais?.message}
                        </FieldError>
                      </Field>
                    </div>
                    {fields.length > 1 ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                        Remover forma
                      </Button>
                    ) : null}
                  </div>
                ))}
                <FieldError>{form.formState.errors.splits?.message}</FieldError>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() =>
                    append({
                      method: 'CASH',
                      amountReais: '0,00',
                      cardBrand: '',
                      installmentsQty: null,
                    })
                  }
                >
                  + Forma de pagamento
                </Button>
                <Field>
                  <FieldLabel htmlFor="payment-notes">Observações</FieldLabel>
                  <Textarea id="payment-notes" rows={2} {...form.register('notes')} />
                </Field>
              </FieldGroup>


              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? 'Registrando…' : 'Confirmar baixa'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
