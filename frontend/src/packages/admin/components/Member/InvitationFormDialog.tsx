'use client';

import { ROLE_LABELS, ROLES } from '@/packages/admin/enum/RoleEnum';
import { useInvitationCreateHook } from '@/packages/admin/hooks/Invitation/useInvitationCreateHook';
import { useInvitationFormHook } from '@/packages/admin/hooks/Invitation/useInvitationFormHook';
import type { InvitationCreateFormValues } from '@/packages/admin/schemas/Invitation/InvitationSchema';
import type { InvitationFormDialogProps } from '@/packages/admin/types/Member/InvitationFormDialogTypes';
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

export function InvitationFormDialog({ onClose }: InvitationFormDialogProps) {
  const form = useInvitationFormHook();
  const create = useInvitationCreateHook();

  const onSave = async (values: InvitationCreateFormValues) => {
    await create.mutateAsync(values);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Convidar membro</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              void form.handleSubmit(onSave)(e);
            }}
          >
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.email)}>
                <FieldLabel htmlFor="invite-email">E-mail</FieldLabel>
                <Input id="invite-email" type="email" {...form.register('email')} />
                <FieldError>{form.formState.errors.email?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.role)}>
                <FieldLabel htmlFor="invite-role">Papel</FieldLabel>
                <NativeSelect id="invite-role" {...form.register('role')}>
                  {ROLES.map((role) => (
                    <NativeSelectOption key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError>{form.formState.errors.role?.message}</FieldError>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Enviando…' : 'Convidar'}
              </Button>
            </DialogFooter>
          </form>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
