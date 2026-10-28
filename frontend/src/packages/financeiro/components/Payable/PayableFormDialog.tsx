'use client';

import { useEffect } from 'react';
import { centsToReaisInput } from '@/packages/financeiro/helpers/FormatCents';
import { useFinancialCategoryListHook } from '@/packages/financeiro/hooks/FinancialCategory/useFinancialCategoryListHook';
import { usePayableCreateHook } from '@/packages/financeiro/hooks/Payable/usePayableCreateHook';
import { usePayableFormHook } from '@/packages/financeiro/hooks/Payable/usePayableFormHook';
import { usePayableUpdateHook } from '@/packages/financeiro/hooks/Payable/usePayableUpdateHook';
import {
  toPayableCreatePayload,
  toPayableUpdatePayload,
  type PayableFormValues,
} from '@/packages/financeiro/schemas/Payable/PayableSchema';
import type { PayableFormDialogProps } from '@/packages/financeiro/types/Payable/PayableFormDialogTypes';
import { MotionDialogBody } from '@/shared/motion/MotionDialogBody';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
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
import { DatePicker } from '@/shared/ui/date-picker';
import { dateToIso, isoToDate } from '@/shared/helpers/DateIso';

export function PayableFormDialog({ unitId, payable, onClose }: PayableFormDialogProps) {
  const categories = useFinancialCategoryListHook('EXPENSE');
  const form = usePayableFormHook();
  const create = usePayableCreateHook();
  const update = usePayableUpdateHook(payable?.id ?? '');
  const isEdit = Boolean(payable);

  useEffect(() => {
    if (!payable) return;
    form.reset({
      categoryId: payable.categoryId ?? '',
      description: payable.description,
      amountReais: centsToReaisInput(payable.amountCents),
      dueDate: payable.dueDate,
      supplier: payable.supplier ?? '',
      monthly: payable.recurrence?.frequency === 'MONTHLY',
      until: payable.recurrence?.until ?? '',
    });
  }, [payable, form]);

  const onSave = async (values: PayableFormValues) => {
    if (isEdit && payable) {
      await update.mutateAsync(toPayableUpdatePayload(values));
    } else {
      await create.mutateAsync(toPayableCreatePayload(unitId, values));
    }
    onClose();
  };

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar conta a pagar' : 'Nova conta a pagar'}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              void form.handleSubmit(onSave)(event);
            }}
          >
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.categoryId)}>
                <FieldLabel htmlFor="payable-category">Categoria</FieldLabel>
                <NativeSelect
                  id="payable-category"
                  value={form.watch('categoryId')}
                  onChange={(event) => form.setValue('categoryId', event.target.value)}
                >
                  <NativeSelectOption value="">Selecione…</NativeSelectOption>
                  {(categories.data ?? [])
                    .filter((item) => item.active)
                    .map((item) => (
                      <NativeSelectOption key={item.id} value={item.id}>
                        {item.name}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
                <FieldError>{form.formState.errors.categoryId?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.description)}>
                <FieldLabel htmlFor="payable-desc">Descrição</FieldLabel>
                <Input id="payable-desc" {...form.register('description')} />
                <FieldError>{form.formState.errors.description?.message}</FieldError>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(form.formState.errors.amountReais)}>
                  <FieldLabel htmlFor="payable-amount">Valor (R$)</FieldLabel>
                  <Input id="payable-amount" {...form.register('amountReais')} />
                  <FieldError>{form.formState.errors.amountReais?.message}</FieldError>
                </Field>
                <Field data-invalid={Boolean(form.formState.errors.dueDate)}>
                  <FieldLabel htmlFor="payable-due">Vencimento</FieldLabel>
                  <DatePicker
                    id="payable-due"
                    clearable={false}
                    value={isoToDate(form.watch('dueDate'))}
                    onChange={(next) =>
                      form.setValue('dueDate', dateToIso(next), { shouldValidate: true, shouldDirty: true })
                    }
                    aria-invalid={Boolean(form.formState.errors.dueDate)}
                  />
                  <FieldError>{form.formState.errors.dueDate?.message}</FieldError>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="payable-supplier">Fornecedor</FieldLabel>
                <Input id="payable-supplier" {...form.register('supplier')} />
              </Field>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="payable-monthly"
                  checked={form.watch('monthly')}
                  onCheckedChange={(checked) => form.setValue('monthly', checked === true)}
                />
                <FieldLabel htmlFor="payable-monthly" className="font-normal">
                  Recorrência mensal
                </FieldLabel>
              </div>
              {form.watch('monthly') ? (
                <Field>
                  <FieldLabel htmlFor="payable-until">Até (opcional)</FieldLabel>
                  <DatePicker
                    id="payable-until"
                    clearable={true}
                    value={isoToDate(form.watch('until'))}
                    onChange={(next) =>
                      form.setValue('until', dateToIso(next), { shouldValidate: true, shouldDirty: true })
                    }
                    aria-invalid={Boolean(form.formState.errors.until)}
                  />
                </Field>
              ) : null}
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Salvando…' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
