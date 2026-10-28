'use client';

import { useEffect } from 'react';
import { useChairCreateHook } from '@/packages/admin/hooks/Chair/useChairCreateHook';
import {
  useChairCreateFormHook,
  useChairUpdateFormHook,
} from '@/packages/admin/hooks/Chair/useChairFormHook';
import { useChairUpdateHook } from '@/packages/admin/hooks/Chair/useChairUpdateHook';
import type {
  ChairCreateFormValues,
  ChairUpdateFormValues,
} from '@/packages/admin/schemas/Chair/ChairSchema';
import type { ChairFormDialogProps } from '@/packages/admin/types/Chair/ChairFormDialogTypes';
import { MotionDialogBody } from '@/shared/motion/MotionDialogBody';
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

export function ChairFormDialog({ mode, unitId, chair, onClose }: ChairFormDialogProps) {
  const createForm = useChairCreateFormHook();
  const updateForm = useChairUpdateFormHook();
  const create = useChairCreateHook(unitId);
  const update = useChairUpdateHook(unitId);

  useEffect(() => {
    if (mode !== 'edit' || !chair) return;
    updateForm.reset({
      name: chair.name,
      color: chair.color ?? '',
      active: chair.active,
    });
  }, [mode, chair, updateForm]);

  const onCreate = async (values: ChairCreateFormValues) => {
    await create.mutateAsync({
      name: values.name,
      color: values.color?.trim() ? values.color : null,
    });
    onClose();
  };

  const onUpdate = async (values: ChairUpdateFormValues) => {
    if (!chair) return;
    await update.mutateAsync({
      chairId: chair.id,
      chairSchema: {
        name: values.name,
        color: values.color?.trim() ? values.color : null,
        active: values.active,
      },
    });
    onClose();
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Nova cadeira' : 'Editar cadeira'}</DialogTitle>
          </DialogHeader>

          {mode === 'create' ? (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                void createForm.handleSubmit(onCreate)(e);
              }}
            >
              <FieldGroup>
                <Field data-invalid={Boolean(createForm.formState.errors.name)}>
                  <FieldLabel htmlFor="chair-name">Nome</FieldLabel>
                  <Input id="chair-name" {...createForm.register('name')} />
                  <FieldError>{createForm.formState.errors.name?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="chair-color">Cor (opcional)</FieldLabel>
                  <Input id="chair-color" placeholder="#3B82F6" {...createForm.register('color')} />
                </Field>
              </FieldGroup>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Salvando…' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                void updateForm.handleSubmit(onUpdate)(e);
              }}
            >
              <FieldGroup>
                <Field data-invalid={Boolean(updateForm.formState.errors.name)}>
                  <FieldLabel htmlFor="chair-edit-name">Nome</FieldLabel>
                  <Input id="chair-edit-name" {...updateForm.register('name')} />
                  <FieldError>{updateForm.formState.errors.name?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="chair-edit-color">Cor (opcional)</FieldLabel>
                  <Input
                    id="chair-edit-color"
                    placeholder="#3B82F6"
                    {...updateForm.register('color')}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="chair-active">Status</FieldLabel>
                  <NativeSelect
                    id="chair-active"
                    value={updateForm.watch('active') ? 'true' : 'false'}
                    onChange={(e) => updateForm.setValue('active', e.target.value === 'true')}
                  >
                    <NativeSelectOption value="true">Ativa</NativeSelectOption>
                    <NativeSelectOption value="false">Inativa</NativeSelectOption>
                  </NativeSelect>
                </Field>
              </FieldGroup>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Salvando…' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
