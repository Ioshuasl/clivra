'use client';

import { useEffect } from 'react';
import {
  useProcedureCreateFormHook,
  useProcedureUpdateFormHook,
} from '@/packages/admin/hooks/Procedure/useProcedureFormHook';
import { useProcedureCreateHook } from '@/packages/admin/hooks/Procedure/useProcedureCreateHook';
import { useProcedureUpdateHook } from '@/packages/admin/hooks/Procedure/useProcedureUpdateHook';
import type {
  ProcedureCreateFormValues,
  ProcedureUpdateFormValues,
} from '@/packages/admin/schemas/Procedure/ProcedureSchema';
import type { ProcedureFormDialogProps } from '@/packages/admin/types/Procedure/ProcedureFormDialogTypes';
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

export function ProcedureFormDialog({ mode, procedure, onClose }: ProcedureFormDialogProps) {
  const createForm = useProcedureCreateFormHook();
  const updateForm = useProcedureUpdateFormHook();
  const create = useProcedureCreateHook();
  const update = useProcedureUpdateHook();

  useEffect(() => {
    if (mode !== 'edit' || !procedure) return;
    updateForm.reset({
      name: procedure.name,
      specialty: procedure.specialty ?? '',
      defaultMinutes: procedure.defaultMinutes,
      priceCents: procedure.priceCents,
      requiresTooth: procedure.requiresTooth,
      requiresFace: procedure.requiresFace,
      active: procedure.active,
    });
  }, [mode, procedure, updateForm]);

  const onCreate = async (values: ProcedureCreateFormValues) => {
    await create.mutateAsync({
      ...values,
      specialty: values.specialty?.trim() ? values.specialty : null,
    });
    onClose();
  };

  const onUpdate = async (values: ProcedureUpdateFormValues) => {
    if (!procedure) return;
    await update.mutateAsync({
      procedureId: procedure.id,
      procedureSchema: {
        ...values,
        specialty: values.specialty?.trim() ? values.specialty : null,
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
            <DialogTitle>
              {mode === 'create' ? 'Novo procedimento' : 'Editar procedimento'}
            </DialogTitle>
          </DialogHeader>

          {mode === 'create' ? (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                void createForm.handleSubmit(onCreate)(e);
              }}
            >
              <FieldGroup>
                <Field data-invalid={Boolean(createForm.formState.errors.code)}>
                  <FieldLabel htmlFor="code">Código</FieldLabel>
                  <Input id="code" {...createForm.register('code')} />
                  <FieldError>{createForm.formState.errors.code?.message}</FieldError>
                </Field>
                <Field data-invalid={Boolean(createForm.formState.errors.name)}>
                  <FieldLabel htmlFor="name">Nome</FieldLabel>
                  <Input id="name" {...createForm.register('name')} />
                  <FieldError>{createForm.formState.errors.name?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="specialty">Especialidade</FieldLabel>
                  <Input id="specialty" {...createForm.register('specialty')} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="defaultMinutes">Duração (min)</FieldLabel>
                  <Input
                    id="defaultMinutes"
                    type="number"
                    {...createForm.register('defaultMinutes', { valueAsNumber: true })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="priceCents">Preço (centavos)</FieldLabel>
                  <Input
                    id="priceCents"
                    type="number"
                    {...createForm.register('priceCents', { valueAsNumber: true })}
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...createForm.register('requiresTooth')} />
                  Requer dente
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...createForm.register('requiresFace')} />
                  Requer face
                </label>
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
                  <FieldLabel htmlFor="edit-name">Nome</FieldLabel>
                  <Input id="edit-name" {...updateForm.register('name')} />
                  <FieldError>{updateForm.formState.errors.name?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-specialty">Especialidade</FieldLabel>
                  <Input id="edit-specialty" {...updateForm.register('specialty')} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-defaultMinutes">Duração (min)</FieldLabel>
                  <Input
                    id="edit-defaultMinutes"
                    type="number"
                    {...updateForm.register('defaultMinutes', { valueAsNumber: true })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-priceCents">Preço (centavos)</FieldLabel>
                  <Input
                    id="edit-priceCents"
                    type="number"
                    {...updateForm.register('priceCents', { valueAsNumber: true })}
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...updateForm.register('requiresTooth')} />
                  Requer dente
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...updateForm.register('requiresFace')} />
                  Requer face
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...updateForm.register('active')} />
                  Ativo
                </label>
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
