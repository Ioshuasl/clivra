'use client';

import { useEffect } from 'react';
import {
  useProfessionalCreateFormHook,
  useProfessionalUpdateFormHook,
} from '@/packages/admin/hooks/Professional/useProfessionalFormHook';
import { useProfessionalCreateHook } from '@/packages/admin/hooks/Professional/useProfessionalCreateHook';
import { useProfessionalUpdateHook } from '@/packages/admin/hooks/Professional/useProfessionalUpdateHook';
import {
  specialtiesFromText,
  type ProfessionalCreateFormValues,
  type ProfessionalUpdateFormValues,
} from '@/packages/admin/schemas/Professional/ProfessionalSchema';
import type { ProfessionalFormDialogProps } from '@/packages/admin/types/Professional/ProfessionalFormDialogTypes';
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

export function ProfessionalFormDialog({
  mode,
  professional,
  members,
  professionals,
  onClose,
}: ProfessionalFormDialogProps) {
  const createForm = useProfessionalCreateFormHook();
  const updateForm = useProfessionalUpdateFormHook();
  const create = useProfessionalCreateHook();
  const update = useProfessionalUpdateHook();

  const usedMembershipIds = new Set(professionals.map((item) => item.membershipId));
  const availableMembers = members.filter(
    (member) =>
      !usedMembershipIds.has(member.membershipId) ||
      member.membershipId === professional?.membershipId,
  );

  useEffect(() => {
    if (mode !== 'edit' || !professional) return;
    updateForm.reset({
      croNumber: professional.croNumber ?? '',
      croState: professional.croState ?? '',
      specialtiesText: professional.specialties.join(', '),
      color: professional.color ?? '',
      active: professional.active,
    });
  }, [mode, professional, updateForm]);

  const onCreate = async (values: ProfessionalCreateFormValues) => {
    await create.mutateAsync({
      membershipId: values.membershipId,
      croNumber: values.croNumber?.trim() ? values.croNumber : null,
      croState: values.croState?.trim() ? values.croState : null,
      specialties: specialtiesFromText(values.specialtiesText),
      color: values.color?.trim() ? values.color : null,
    });
    onClose();
  };

  const onUpdate = async (values: ProfessionalUpdateFormValues) => {
    if (!professional) return;
    await update.mutateAsync({
      professionalId: professional.id,
      professionalSchema: {
        croNumber: values.croNumber?.trim() ? values.croNumber : null,
        croState: values.croState?.trim() ? values.croState : null,
        specialties: specialtiesFromText(values.specialtiesText),
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
            <DialogTitle>
              {mode === 'create' ? 'Novo profissional' : 'Editar profissional'}
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
                <Field data-invalid={Boolean(createForm.formState.errors.membershipId)}>
                  <FieldLabel htmlFor="membershipId">Membro</FieldLabel>
                  <NativeSelect id="membershipId" {...createForm.register('membershipId')}>
                    <NativeSelectOption value="">Selecione…</NativeSelectOption>
                    {availableMembers.map((member) => (
                      <NativeSelectOption key={member.membershipId} value={member.membershipId}>
                        {member.name} ({member.email})
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError>{createForm.formState.errors.membershipId?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="croNumber">CRO</FieldLabel>
                  <Input id="croNumber" {...createForm.register('croNumber')} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="croState">UF CRO</FieldLabel>
                  <Input id="croState" maxLength={2} {...createForm.register('croState')} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="specialtiesText">Especialidades (vírgula)</FieldLabel>
                  <Input id="specialtiesText" {...createForm.register('specialtiesText')} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="color">Cor</FieldLabel>
                  <Input id="color" {...createForm.register('color')} />
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
                <Field>
                  <FieldLabel htmlFor="edit-croNumber">CRO</FieldLabel>
                  <Input id="edit-croNumber" {...updateForm.register('croNumber')} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-croState">UF CRO</FieldLabel>
                  <Input id="edit-croState" maxLength={2} {...updateForm.register('croState')} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-specialtiesText">Especialidades (vírgula)</FieldLabel>
                  <Input id="edit-specialtiesText" {...updateForm.register('specialtiesText')} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-color">Cor</FieldLabel>
                  <Input id="edit-color" {...updateForm.register('color')} />
                </Field>
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
